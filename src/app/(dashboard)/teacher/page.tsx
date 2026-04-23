import Link from "next/link"
import { getServerSession } from "next-auth"
import { unstable_cache } from "next/cache"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Users,
} from "lucide-react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  formatSessionDate,
  formatSessionTime,
  getEffectiveSessionMeetingSettings,
  getSessionJoinWindowState,
  getSessionStatusBadge,
  SESSION_JOIN_LEAD_MINUTES,
} from "@/lib/attendance-utils"
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"
import { ReportStatusBadge } from "@/components/reports/report-status-badge"
import { TeacherJoinButton } from "@/components/teacher/sessions/teacher-join-button"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

async function getTeacherDashboardData(userId: string) {
  return unstable_cache(
    async () => {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId },
        select: { id: true },
      })

      if (!teacherProfile) {
        return null
      }

      const now = new Date()
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date(startOfToday)
      endOfToday.setDate(endOfToday.getDate() + 1)

      const [
        assignedClasses,
        enrolledStudents,
        todaysClasses,
        pendingReports,
        upcomingSessions,
        recentReports,
      ] = await Promise.all([
        prisma.classTeacher.findMany({
          where: {
            teacherProfileId: teacherProfile.id,
            class: {
              status: "active",
            },
          },
          select: {
            role: true,
            class: {
              select: {
                id: true,
                name: true,
                section: true,
                academicYear: true,
                scheduleDays: true,
                scheduleStartTime: true,
                scheduleEndTime: true,
                scheduleRecurrence: true,
                course: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                enrollments: {
                  where: {
                    status: "active",
                  },
                  select: {
                    id: true,
                  },
                },
                sessions: {
                  where: {
                    endTime: { gte: now },
                    status: {
                      in: ["scheduled", "ongoing"],
                    },
                  },
                  orderBy: {
                    startTime: "asc",
                  },
                  take: 1,
                  select: {
                    id: true,
                    startTime: true,
                    status: true,
                  },
                },
              },
            },
          },
          orderBy: {
            class: {
              name: "asc",
            },
          },
        }),
        prisma.enrollment.findMany({
          where: {
            status: "active",
            class: {
              status: "active",
              teachers: {
                some: {
                  teacherProfileId: teacherProfile.id,
                },
              },
            },
          },
          select: {
            studentProfileId: true,
          },
          distinct: ["studentProfileId"],
        }),
        prisma.classSession.count({
          where: {
            class: {
              status: "active",
              teachers: {
                some: {
                  teacherProfileId: teacherProfile.id,
                },
              },
            },
            sessionDate: {
              gte: startOfToday,
              lt: endOfToday,
            },
            status: {
              in: ["scheduled", "ongoing", "completed"],
            },
          },
        }),
        prisma.report.count({
          where: {
            teacherProfileId: teacherProfile.id,
            status: "draft",
          },
        }),
        prisma.classSession.findMany({
          where: {
            class: {
              status: "active",
              teachers: {
                some: {
                  teacherProfileId: teacherProfile.id,
                },
              },
            },
            endTime: { gte: now },
            status: {
              in: ["scheduled", "ongoing"],
            },
          },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            status: true,
            meetingPlatform: true,
            meetingLink: true,
            class: {
              select: {
                id: true,
                name: true,
                defaultMeetingPlatform: true,
                defaultMeetingLink: true,
                course: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
            teacherJoins: {
              where: {
                teacherProfileId: teacherProfile.id,
              },
              select: {
                joinTime: true,
                status: true,
                lateMinutes: true,
              },
              take: 1,
            },
          },
          orderBy: {
            startTime: "asc",
          },
          take: 5,
        }),
        prisma.report.findMany({
          where: {
            teacherProfileId: teacherProfile.id,
          },
          select: {
            id: true,
            reportType: true,
            status: true,
            reportDate: true,
            updatedAt: true,
            class: {
              select: {
                id: true,
                name: true,
                course: {
                  select: {
                    code: true,
                  },
                },
              },
            },
            studentProfile: {
              select: {
                studentId: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 5,
        }),
      ])

      return {
        assignedClasses,
        totalStudents: enrolledStudents.length,
        todaysClasses,
        pendingReports,
        upcomingSessions,
        recentReports,
      }
    },
    ["teacher-dashboard", userId],
    {
      revalidate: 60,
    }
  )()
}

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const dashboardData = await getTeacherDashboardData(session.user.id)

  if (!dashboardData) {
    redirect("/login")
  }
  const {
    assignedClasses,
    totalStudents,
    todaysClasses,
    pendingReports,
    upcomingSessions,
    recentReports,
  } = dashboardData

  const stats = {
    myClasses: assignedClasses.length,
    totalStudents,
    todaysClasses,
    pendingReports,
  }
  const hasAssignedClasses = stats.myClasses > 0
  const academyPrimaryColor = session.user.academy?.primaryColor || "#059669"
  const visibleJoinButtons = upcomingSessions.filter((upcomingSession) =>
    getSessionJoinWindowState({
      startTime: upcomingSession.startTime,
      endTime: upcomingSession.endTime,
      status: upcomingSession.status,
    }).isVisible
  ).length

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg border p-6"
        style={{
          background: `linear-gradient(135deg, ${academyPrimaryColor}10 0%, transparent 100%)`,
          borderColor: `${academyPrimaryColor}30`,
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {session.user.firstName}!
            </h2>
            <p className="mt-2 text-muted-foreground">
              {hasAssignedClasses
                ? `You are currently teaching ${stats.myClasses} active class${stats.myClasses === 1 ? "" : "es"}. Here is your live teaching overview for today.`
                : "You do not have any active classes assigned yet. Once your academy admin assigns a class, your students, sessions, and report workload will appear here."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/teacher/classes">
              <Button>
                <BookOpen className="mr-2 h-4 w-4" />
                View My Classes
              </Button>
            </Link>
            <Link href="/teacher/reports/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Report
              </Button>
            </Link>
            <Link href="/teacher/posts/new">
              <Button variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="My Classes"
          value={stats.myClasses.toLocaleString()}
          description="Active classes assigned to you"
          icon={BookOpen}
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents.toLocaleString()}
          description="Unique active students across your classes"
          icon={Users}
        />
        <StatCard
          title="Today's Classes"
          value={stats.todaysClasses.toLocaleString()}
          description="Scheduled teaching sessions for today"
          icon={Calendar}
        />
        <StatCard
          title="Pending Reports"
          value={stats.pendingReports.toLocaleString()}
          description="Draft reports waiting to be finished"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Your Classes</CardTitle>
              <CardDescription>
                Active classes currently assigned to you
              </CardDescription>
            </div>
            <Link href="/teacher/classes">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {assignedClasses.length === 0 ? (
              <DashboardEmptyState
                icon={BookOpen}
                title="No classes assigned yet"
                description="Ask your academy admin to assign a class to you. As soon as that happens, your student list and session schedule will show up here."
              />
            ) : (
              <div className="space-y-3">
                {assignedClasses.slice(0, 4).map((assignment) => {
                  const nextSession = assignment.class.sessions[0]

                  return (
                    <Link
                      key={assignment.class.id}
                      href={`/teacher/classes/${assignment.class.id}/sessions`}
                      className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {assignment.class.course.code}: {assignment.class.name}
                            </p>
                            <Badge variant={assignment.role === "primary" ? "default" : "outline"}>
                              {assignment.role}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {assignment.class.enrollments.length} active student
                            {assignment.class.enrollments.length === 1 ? "" : "s"}
                            {assignment.class.section ? ` - Section ${assignment.class.section}` : ""}
                            {assignment.class.academicYear ? ` - ${assignment.class.academicYear}` : ""}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {nextSession
                              ? `Next session: ${formatSessionDate(new Date(nextSession.startTime))} at ${formatSessionTime(new Date(nextSession.startTime))}`
                              : "No upcoming sessions scheduled"}
                          </p>
                          <div className="mt-3">
                            <ClassScheduleSummary
                              scheduleDays={assignment.class.scheduleDays}
                              scheduleStartTime={assignment.class.scheduleStartTime}
                              scheduleEndTime={assignment.class.scheduleEndTime}
                              scheduleRecurrence={assignment.class.scheduleRecurrence}
                              emptyMessage="No recurring schedule has been configured yet."
                            />
                          </div>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>
                Your next scheduled or ongoing sessions
              </CardDescription>
            </div>
            <Link href="/teacher/classes">
              <Button variant="ghost" size="sm">
                Class schedules
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <DashboardEmptyState
                icon={Calendar}
                title="No upcoming sessions"
                description="Once sessions are created for your classes, the next ones on your teaching schedule will appear here."
              />
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((upcomingSession) => {
                  const sessionBadge = getSessionStatusBadge(upcomingSession.status)
                  const joinWindow = getSessionJoinWindowState({
                    startTime: upcomingSession.startTime,
                    endTime: upcomingSession.endTime,
                    status: upcomingSession.status,
                  })
                  const effectiveMeetingSettings = getEffectiveSessionMeetingSettings({
                    sessionMeetingPlatform: upcomingSession.meetingPlatform,
                    sessionMeetingLink: upcomingSession.meetingLink,
                    classMeetingPlatform:
                      upcomingSession.class.defaultMeetingPlatform,
                    classMeetingLink: upcomingSession.class.defaultMeetingLink,
                  })
                  const initialJoin = upcomingSession.teacherJoins[0]
                    ? {
                        joinTime:
                          upcomingSession.teacherJoins[0].joinTime.toISOString(),
                        status: upcomingSession.teacherJoins[0].status,
                        lateMinutes:
                          upcomingSession.teacherJoins[0].lateMinutes,
                      }
                    : null

                  return (
                    <div
                      key={upcomingSession.id}
                      className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/teacher/sessions/${upcomingSession.id}`}
                            className="block"
                          >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {upcomingSession.title || `${upcomingSession.class.course.code} session`}
                            </p>
                            <Badge variant={toBadgeVariant(sessionBadge.variant)}>
                              {sessionBadge.label}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {upcomingSession.class.course.code}: {upcomingSession.class.name}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {formatSessionDate(new Date(upcomingSession.startTime))} -{" "}
                            {formatSessionTime(new Date(upcomingSession.startTime))} -{" "}
                            {formatSessionTime(new Date(upcomingSession.endTime))}
                          </p>
                          {joinWindow.isVisible ? (
                            <p className="mt-2 text-xs font-medium text-emerald-600">
                              {joinWindow.isLive
                                ? "Class is live now."
                                : `Starts in ${joinWindow.startsInMinutes} minute${joinWindow.startsInMinutes === 1 ? "" : "s"}.`}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Join button appears {SESSION_JOIN_LEAD_MINUTES} minutes before start.
                            </p>
                          )}
                          </Link>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                          {joinWindow.isVisible ? (
                            <TeacherJoinButton
                              sessionId={upcomingSession.id}
                              sessionStatus={upcomingSession.status}
                              meetingPlatform={effectiveMeetingSettings.platform}
                              meetingLink={effectiveMeetingSettings.link}
                              initialJoin={initialJoin}
                              align="start"
                              showMeta={false}
                              className="w-full sm:w-auto"
                            />
                          ) : (
                            <Link href={`/teacher/sessions/${upcomingSession.id}`}>
                              <Button variant="outline" className="w-full sm:w-auto">
                                View Session
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {visibleJoinButtons === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    No classes are in their join window right now. Join buttons appear {SESSION_JOIN_LEAD_MINUTES} minutes before the class starts.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Your latest report work across assigned students
              </CardDescription>
            </div>
            <Link href="/teacher/reports">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <DashboardEmptyState
                icon={FileText}
                title="No reports yet"
                description="Create your first student report when you are ready to publish progress updates."
              />
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/teacher/reports/${report.id}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {report.studentProfile.user.firstName} {report.studentProfile.user.lastName}
                          </p>
                          <ReportStatusBadge status={report.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {report.class.course.code}: {report.class.name} - {report.studentProfile.studentId}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Report date: {new Date(report.reportDate).toLocaleDateString()} - Updated{" "}
                          {new Date(report.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Jump straight into the teacher tools you use most
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <QuickActionButton
              href="/teacher/classes"
              icon={BookOpen}
              title="My Classes"
              description="Manage sessions and attendance"
            />
            <QuickActionButton
              href="/teacher/reports/new"
              icon={FileText}
              title="Create Report"
              description="Start a new student report"
            />
            <QuickActionButton
              href="/teacher/posts/new"
              icon={MessageSquare}
              title="New Announcement"
              description="Share an update with your classes"
            />
            <QuickActionButton
              href="/notifications"
              icon={Bell}
              title="Notifications"
              description="Review reminders and updates"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

interface DashboardEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

function DashboardEmptyState({
  icon: Icon,
  title,
  description,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
      <Icon className="mb-4 h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

interface QuickActionButtonProps {
  href: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

function QuickActionButton({
  href,
  title,
  description,
  icon: Icon,
}: QuickActionButtonProps) {
  return (
    <Link href={href}>
      <div className="rounded-lg border p-4 transition-colors hover:bg-muted/40">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function toBadgeVariant(variant: string): BadgeProps["variant"] {
  switch (variant) {
    case "secondary":
      return "secondary"
    case "destructive":
      return "destructive"
    case "outline":
      return "outline"
    case "success":
      return "success"
    case "warning":
      return "warning"
    default:
      return "default"
  }
}
