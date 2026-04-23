import Link from "next/link"
import { getServerSession } from "next-auth"
import { unstable_cache } from "next/cache"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  Receipt,
  Users,
} from "lucide-react"
import { authOptions } from "@/lib/auth"
import { calculateOutstandingAmount } from "@/lib/invoice-utils"
import { syncRecurringSessionsForClasses } from "@/lib/class-session-schedule"
import { prisma } from "@/lib/prisma"
import {
  formatSessionDate,
  formatSessionTime,
  getEffectiveSessionMeetingSettings,
  getSessionJoinWindowState,
  SESSION_JOIN_LEAD_MINUTES,
} from "@/lib/attendance-utils"
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"
import { JoinSessionButton } from "@/components/student/join-session-button"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { ReportStatusBadge } from "@/components/reports/report-status-badge"
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

async function getStudentDashboardCoreData(userId: string) {
  return unstable_cache(
    async () => {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { id: true, studentId: true },
      })

      if (!studentProfile) {
        return null
      }

      const activeEnrollmentClassIds = await prisma.enrollment.findMany({
        where: {
          studentProfileId: studentProfile.id,
          status: "active",
        },
        select: {
          classId: true,
        },
      })

      await syncRecurringSessionsForClasses(
        activeEnrollmentClassIds.map((enrollment) => enrollment.classId)
      )

      const now = new Date()
      const recentAttendanceStart = new Date(now)
      recentAttendanceStart.setDate(recentAttendanceStart.getDate() - 30)

      const [
        enrollments,
        recentAttendance,
        recentReports,
        publishedReportsCount,
        invoices,
      ] = await Promise.all([
        prisma.enrollment.findMany({
          where: {
            studentProfileId: studentProfile.id,
            status: "active",
          },
          include: {
            class: {
              include: {
                course: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                teachers: {
                  where: {
                    role: "primary",
                  },
                  include: {
                    teacherProfile: {
                      include: {
                        user: {
                          select: {
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
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
                    title: true,
                    startTime: true,
                    endTime: true,
                    status: true,
                    meetingPlatform: true,
                    meetingLink: true,
                    attendances: {
                      where: {
                        studentProfileId: studentProfile.id,
                      },
                      select: {
                        joinTime: true,
                        lateMinutes: true,
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            enrolledAt: "desc",
          },
        }),
        prisma.attendance.findMany({
          where: {
            studentProfileId: studentProfile.id,
            classSession: {
              sessionDate: {
                gte: recentAttendanceStart,
              },
            },
          },
          select: {
            status: true,
          },
        }),
        prisma.report.findMany({
          where: {
            studentProfileId: studentProfile.id,
            status: "published",
          },
          select: {
            id: true,
            reportType: true,
            reportDate: true,
            publishedAt: true,
            status: true,
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
            teacherProfile: {
              select: {
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
            publishedAt: "desc",
          },
          take: 4,
        }),
        prisma.report.count({
          where: {
            studentProfileId: studentProfile.id,
            status: "published",
          },
        }),
        prisma.invoice.findMany({
          where: {
            studentProfileId: studentProfile.id,
            status: { not: "draft" },
          },
          include: {
            class: {
              include: {
                course: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
            payments: {
              where: { status: "completed" },
            },
            adjustments: true,
          },
          orderBy: {
            issuedAt: "desc",
          },
        }),
      ])

      return {
        studentProfile,
        now: now.toISOString(),
        enrollments,
        recentAttendance,
        recentReports,
        publishedReportsCount,
        invoices,
      }
    },
    ["student-dashboard-core", userId],
    {
      revalidate: 60,
    }
  )()
}

function buildCurrencyTotals(rows: Array<{ currency: string; amount: number }>) {
  const totals = new Map<string, number>()

  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) || 0) + row.amount)
  }

  return Array.from(totals.entries()).map(([currency, amount]) => ({
    currency,
    amount,
  }))
}

function formatRelativeDate(date: Date | string | null | undefined, now: Date) {
  if (!date) return "-"

  const safeDate = new Date(date)

  if (Number.isNaN(safeDate.getTime())) return "invalid date"

  const diffMs = now.getTime() - safeDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day ago`
}

function renderCurrencyTotals(
  totals: Array<{
    currency: string
    amount: number
  }>
) {
  if (totals.length === 0) {
    return <span className="text-2xl font-bold">None</span>
  }

  if (totals.length === 1) {
    const [total] = totals
    return (
      <CurrencyAmount
        amount={total.amount}
        currency={total.currency}
        className="text-2xl font-bold"
      />
    )
  }

  return (
    <div className="space-y-1">
      {totals.map((total) => (
        <div key={total.currency} className="text-sm font-semibold">
          <CurrencyAmount amount={total.amount} currency={total.currency} />
        </div>
      ))}
    </div>
  )
}

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/login")
  }

  const dashboardData = await getStudentDashboardCoreData(session.user.id)

  if (!dashboardData) {
    redirect("/login")
  }
  const {
    studentProfile,
    enrollments,
    recentAttendance,
    recentReports,
    publishedReportsCount,
    invoices,
    now: cachedNow,
  } = dashboardData
  const now = new Date(cachedNow)
  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      message: true,
      isRead: true,
      actionUrl: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  })

  const attendanceSummary = recentAttendance.reduce(
    (summary, record) => {
      summary.total += 1

      if (record.status === "present") {
        summary.present += 1
      } else if (record.status === "late") {
        summary.late += 1
      } else if (record.status === "absent") {
        summary.absent += 1
      } else if (record.status === "excused") {
        summary.excused += 1
      }

      return summary
    },
    {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
    }
  )

  const attendedCount =
    attendanceSummary.present +
    attendanceSummary.late +
    attendanceSummary.excused
  const attendanceRate =
    attendanceSummary.total > 0
      ? Math.round((attendedCount / attendanceSummary.total) * 100)
      : null

  const invoiceSnapshots = invoices.map((invoice) => {
    const paidAmount = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    )
    const outstanding = calculateOutstandingAmount(
      Number(invoice.totalAmount),
      paidAmount,
      invoice.adjustments.map((adjustment) => ({
        type: adjustment.type,
        amount: Number(adjustment.amount),
      }))
    )

    return {
      ...invoice,
      paidAmount,
      outstanding,
    }
  })

  const outstandingByCurrency = buildCurrencyTotals(
    invoiceSnapshots.flatMap((invoice) =>
      invoice.outstanding > 0
        ? [{ currency: invoice.currency, amount: invoice.outstanding }]
        : []
    )
  )

  const latestInvoice = invoiceSnapshots[0] || null
  const outstandingInvoices = invoiceSnapshots.filter((invoice) => invoice.outstanding > 0)
  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length
  const academyPrimaryColor = session.user.academy?.primaryColor || "#059669"
  const visibleDashboardJoins = enrollments.slice(0, 4).filter((enrollment) => {
    const nextSession = enrollment.class.sessions[0]

    if (!nextSession) {
      return false
    }

    return getSessionJoinWindowState({
      startTime: nextSession.startTime,
      endTime: nextSession.endTime,
      status: nextSession.status,
    }).isVisible
  }).length

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
              {enrollments.length > 0
                ? `You are enrolled in ${enrollments.length} active class${enrollments.length === 1 ? "" : "es"}. Here is your live overview for classes, reports, attendance, and fees.`
                : "You do not have any active class enrollments yet. Once your academy enrolls you, your classes, reports, and finance details will appear here."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/student/classes">
              <Button>
                <BookOpen className="mr-2 h-4 w-4" />
                My Classes
              </Button>
            </Link>
            <Link href="/student/reports">
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                My Reports
              </Button>
            </Link>
            <Link href="/student/finance">
              <Button variant="outline">
                <DollarSign className="mr-2 h-4 w-4" />
                Finance
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="My Classes"
          value={<span className="text-2xl font-bold">{enrollments.length}</span>}
          description="Active classes you are enrolled in"
        />
        <StatCard
          title="Attendance Summary"
          value={
            <span className="text-2xl font-bold">
              {attendanceRate === null ? "No records" : `${attendanceRate}%`}
            </span>
          }
          description={
            attendanceSummary.total > 0
              ? `Last 30 days: ${attendanceSummary.present} present, ${attendanceSummary.late} late, ${attendanceSummary.absent} absent`
              : "No attendance has been recorded in the last 30 days"
          }
          detail={
            attendanceSummary.excused > 0
              ? `${attendanceSummary.excused} excused session${attendanceSummary.excused === 1 ? "" : "s"}`
              : undefined
          }
        />
        <StatCard
          title="Published Reports"
          value={<span className="text-2xl font-bold">{publishedReportsCount}</span>}
          description={
            recentReports[0]?.publishedAt
              ? `Latest published ${new Date(recentReports[0].publishedAt).toLocaleDateString()}`
              : "No published reports available yet"
          }
        />
        <StatCard
          title="Outstanding Fees"
          value={renderCurrencyTotals(outstandingByCurrency)}
          description={
            latestInvoice
              ? `Latest invoice ${latestInvoice.invoiceNumber} is ${latestInvoice.status}`
              : "No invoices issued yet"
          }
          detail={
            outstandingInvoices.length > 0
              ? `${outstandingInvoices.length} invoice${outstandingInvoices.length === 1 ? "" : "s"} still need payment`
              : undefined
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Enrolled Classes</CardTitle>
              <CardDescription>
                Your active class enrollments and next sessions
              </CardDescription>
            </div>
            <Link href="/student/classes">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 ? (
              <DashboardEmptyState
                icon={BookOpen}
                title="No class enrollments yet"
                description="Once your academy enrolls you in a class, your class list and upcoming sessions will show here."
              />
            ) : (
              <div className="space-y-3">
                {enrollments.slice(0, 4).map((enrollment) => {
                  const primaryTeacher = enrollment.class.teachers[0]?.teacherProfile
                  const nextSession = enrollment.class.sessions[0]
                  const joinWindow = nextSession
                    ? getSessionJoinWindowState({
                        startTime: nextSession.startTime,
                        endTime: nextSession.endTime,
                        status: nextSession.status,
                      })
                    : null
                  const effectiveMeetingSettings = nextSession
                    ? getEffectiveSessionMeetingSettings({
                        sessionMeetingPlatform: nextSession.meetingPlatform,
                        sessionMeetingLink: nextSession.meetingLink,
                        classMeetingPlatform:
                          enrollment.class.defaultMeetingPlatform,
                        classMeetingLink: enrollment.class.defaultMeetingLink,
                      })
                    : null
                  const studentAttendance = nextSession?.attendances[0] || null

                  return (
                    <div
                      key={enrollment.class.id}
                      className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/student/classes/${enrollment.class.id}`}
                            className="block"
                          >
                          <p className="truncate text-sm font-medium">
                            {enrollment.class.course.code}: {enrollment.class.name}
                          </p>
                          {primaryTeacher ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Teacher: {primaryTeacher.user.firstName} {primaryTeacher.user.lastName}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Teacher assignment pending
                            </p>
                          )}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {nextSession
                              ? `Next session: ${formatSessionDate(new Date(nextSession.startTime))} at ${formatSessionTime(new Date(nextSession.startTime))}`
                              : "No upcoming sessions scheduled"}
                          </p>
                          {nextSession ? (
                            joinWindow?.isVisible ? (
                              <p className="mt-2 text-xs font-medium text-emerald-600">
                                {joinWindow.isLive
                                  ? "Class is live now."
                                  : `Starts in ${joinWindow.startsInMinutes} minute${joinWindow.startsInMinutes === 1 ? "" : "s"}.`}
                              </p>
                            ) : (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Join button appears {SESSION_JOIN_LEAD_MINUTES} minutes before class time.
                              </p>
                            )
                          ) : null}
                          <div className="mt-3">
                            <ClassScheduleSummary
                              scheduleDays={enrollment.class.scheduleDays}
                              scheduleStartTime={enrollment.class.scheduleStartTime}
                              scheduleEndTime={enrollment.class.scheduleEndTime}
                              scheduleRecurrence={enrollment.class.scheduleRecurrence}
                              emptyMessage="No recurring schedule has been configured yet."
                            />
                          </div>
                          </Link>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                          {nextSession && joinWindow?.isVisible && effectiveMeetingSettings ? (
                            <JoinSessionButton
                              sessionId={nextSession.id}
                              sessionStatus={nextSession.status}
                              meetingPlatform={effectiveMeetingSettings.platform}
                              meetingLink={effectiveMeetingSettings.link}
                              initialAttendance={
                                studentAttendance
                                  ? {
                                      joinTime: studentAttendance.joinTime
                                        ? studentAttendance.joinTime.toISOString()
                                        : null,
                                      lateMinutes: studentAttendance.lateMinutes,
                                    }
                                  : null
                              }
                              align="start"
                              showMeta={false}
                            />
                          ) : (
                            <Link href={`/student/classes/${enrollment.class.id}`}>
                              <Button variant="outline" className="w-full sm:w-auto">
                                View Class
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {visibleDashboardJoins === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    No class is ready to join right now. Join buttons appear {SESSION_JOIN_LEAD_MINUTES} minutes before class time.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Your latest published progress reports
              </CardDescription>
            </div>
            <Link href="/student/reports">
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
                title="No reports available yet"
                description="Published reports from your teachers will appear here when they are ready."
              />
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/student/reports/${report.id}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {report.class.course.code}: {report.class.name}
                          </p>
                          <ReportStatusBadge status={report.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Teacher: {report.teacherProfile.user.firstName} {report.teacherProfile.user.lastName}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Report date: {new Date(report.reportDate).toLocaleDateString()}
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
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Finance Snapshot</CardTitle>
              <CardDescription>
                Your latest invoice and any unpaid balances
              </CardDescription>
            </div>
            <Link href="/student/finance">
              <Button variant="ghost" size="sm">
                View finance
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {invoiceSnapshots.length === 0 ? (
              <DashboardEmptyState
                icon={Receipt}
                title="No invoices yet"
                description="When your academy issues invoices, you will be able to review them and track payment status here."
              />
            ) : (
              <div className="space-y-3">
                {invoiceSnapshots.slice(0, 4).map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/student/finance/invoices/${invoice.id}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-sm">{invoice.invoiceNumber}</p>
                          <InvoiceStatusBadge status={invoice.status} />
                        </div>
                        <p className="mt-1 text-sm font-medium">{invoice.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Due {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <CurrencyAmount
                          amount={Number(invoice.totalAmount)}
                          currency={invoice.currency}
                          className="font-medium"
                        />
                        {invoice.outstanding > 0 && (
                          <p className="mt-1 text-xs text-red-600">
                            <CurrencyAmount
                              amount={invoice.outstanding}
                              currency={invoice.currency}
                            />{" "}
                            due
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>
                {unreadNotifications} unread notification{unreadNotifications === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <Link href="/notifications">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <DashboardEmptyState
                icon={Bell}
                title="No notifications yet"
                description="Class updates, report alerts, and finance reminders will appear here."
              />
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.actionUrl || "/notifications"}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {notification.title}
                          </p>
                          <Badge variant={notification.isRead ? "outline" : "default"}>
                            {notification.isRead ? "Read" : "Unread"}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeDate(notification.createdAt, now)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Jump to the student features you use most
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionButton
            href="/student/classes"
            icon={BookOpen}
            title="My Classes"
            description="View class details and sessions"
          />
          <QuickActionButton
            href="/student/reports"
            icon={FileText}
            title="Reports"
            description="Open your published reports"
          />
          <QuickActionButton
            href="/student/finance"
            icon={DollarSign}
            title="Finance"
            description="Check invoices and payment status"
          />
          <QuickActionButton
            href="/student/posts"
            icon={MessageSquare}
            title="Announcements"
            description="Read class announcements"
          />
        </CardContent>
      </Card>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: React.ReactNode
  description: string
  detail?: string
}

function StatCard({ title, value, description, detail }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {value}
        <p className="text-xs text-muted-foreground">{description}</p>
        {detail ? (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        ) : null}
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
