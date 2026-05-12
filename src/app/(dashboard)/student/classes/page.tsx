import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { syncRecurringSessionsForClasses } from "@/lib/class-session-schedule"
import { toIsoStringOrNull } from "@/lib/date-serialization"
import { prisma } from "@/lib/prisma"
import { BookOpen, Calendar } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { JoinSessionButton } from "@/components/student/join-session-button"
import {
  getEffectiveSessionMeetingSettings,
  getSessionJoinWindowState,
  isSessionActive,
  SESSION_JOIN_LEAD_MINUTES,
} from "@/lib/attendance-utils"
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"
import { TimeZoneAwareSessionTime } from "@/components/sessions/time-zone-aware-session-time"
import {
  formatSessionDayName,
  getJoinOpensMessage,
  getRelevantClassSession,
  getStartOfLocalDay,
} from "@/lib/relevant-session"

export const metadata: Metadata = {
  title: "My Classes - Student - AcademyFlow",
  description: "View your enrolled classes",
}

export default async function StudentClassesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/login")
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!studentProfile) {
    redirect("/login")
  }

  const activeClassIds = await prisma.enrollment.findMany({
    where: {
      studentProfileId: studentProfile.id,
      status: "active",
    },
    select: {
      classId: true,
    },
  })

  await syncRecurringSessionsForClasses(
    activeClassIds.map((enrollment) => enrollment.classId),
    {
      daysBack: 2,
      daysAhead: 14,
    }
  )

  const academyTimeZone = session.user.academy?.timezone
  const todayStart = getStartOfLocalDay(new Date(), academyTimeZone)

  const enrollments = await prisma.enrollment.findMany({
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
                subjectArea: true,
              },
            },
            teachers: {
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
            where: {
              role: "primary",
            },
          },
          sessions: {
            where: {
              sessionDate: {
                gte: todayStart,
              },
              status: { in: ["scheduled", "ongoing", "completed"] },
            },
            include: {
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
            orderBy: {
              startTime: "asc",
            },
            take: 7,
          },
        },
      },
    },
  })
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Classes</h2>
        <p className="text-muted-foreground">
          View your enrolled classes and upcoming sessions
        </p>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No classes enrolled</h3>
            <p className="text-muted-foreground">
              You haven&apos;t been enrolled in any classes yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {enrollments.map((enrollment) => {
            const cls = enrollment.class
            const primaryTeacher = cls.teachers[0]?.teacherProfile
            const relevantSession = getRelevantClassSession(
              cls.sessions,
              new Date(),
              academyTimeZone
            )
            const joinWindow = relevantSession
              ? getSessionJoinWindowState({
                  startTime: relevantSession.startTime,
                  endTime: relevantSession.endTime,
                  status: relevantSession.status,
                })
              : null
            const effectiveMeetingSettings = relevantSession
              ? getEffectiveSessionMeetingSettings({
                  sessionMeetingPlatform: relevantSession.meetingPlatform,
                  sessionMeetingLink: relevantSession.meetingLink,
                  classMeetingPlatform: cls.defaultMeetingPlatform,
                  classMeetingLink: cls.defaultMeetingLink,
                })
              : null
            const attendance = relevantSession?.attendances[0] || null

            return (
              <Card key={cls.id} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="break-words">{cls.name}</CardTitle>
                    <CardDescription>
                      {cls.course.code} - {cls.course.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {primaryTeacher && (
                        <p className="text-sm">
                          Teacher: {primaryTeacher.user.firstName}{" "}
                          {primaryTeacher.user.lastName}
                        </p>
                      )}

                      <ClassScheduleSummary
                        scheduleDays={cls.scheduleDays}
                        scheduleStartTime={cls.scheduleStartTime}
                        scheduleEndTime={cls.scheduleEndTime}
                        scheduleRecurrence={cls.scheduleRecurrence}
                        academyTimeZone={academyTimeZone}
                        emptyMessage="No recurring schedule has been configured yet."
                      />

                      {relevantSession ? (
                        <div>
                          <p className="mb-2 text-sm font-medium">
                            Today / Next Session
                          </p>
                          <div className="rounded-lg border p-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium">
                                    {relevantSession.title || "Class Session"}
                                  </p>
                                  <Badge
                                    variant={
                                      isSessionActive({
                                        startTime: new Date(relevantSession.startTime),
                                        endTime: new Date(relevantSession.endTime),
                                        status: relevantSession.status,
                                      })
                                        ? "success"
                                        : "outline"
                                    }
                                  >
                                    {isSessionActive({
                                      startTime: new Date(relevantSession.startTime),
                                      endTime: new Date(relevantSession.endTime),
                                      status: relevantSession.status,
                                    })
                                      ? "Live Now"
                                      : formatSessionDayName(relevantSession.startTime)}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatSessionDayName(relevantSession.startTime)}
                                  </span>
                                </div>
                                <TimeZoneAwareSessionTime
                                  startTime={
                                    toIsoStringOrNull(relevantSession.startTime) ||
                                    relevantSession.startTime
                                  }
                                  endTime={toIsoStringOrNull(relevantSession.endTime)}
                                  academyTimeZone={academyTimeZone}
                                  compact
                                />
                              </div>
                              {effectiveMeetingSettings ? (
                                <JoinSessionButton
                                  sessionId={relevantSession.id}
                                  sessionStatus={relevantSession.status}
                                  meetingPlatform={effectiveMeetingSettings.platform}
                                  meetingLink={effectiveMeetingSettings.link}
                                  sessionStartTime={toIsoStringOrNull(relevantSession.startTime)}
                                  sessionEndTime={toIsoStringOrNull(relevantSession.endTime)}
                                  academyTimeZone={academyTimeZone}
                              initialAttendance={
                                attendance
                                  ? {
                                      joinTime: toIsoStringOrNull(
                                        attendance.joinTime
                                      ),
                                      lateMinutes: attendance.lateMinutes,
                                    }
                                  : null
                                  }
                                  disabledReason={
                                    joinWindow?.isVisible
                                      ? null
                                      : relevantSession.status === "completed"
                                        ? "Today's class session has ended."
                                        : getJoinOpensMessage(SESSION_JOIN_LEAD_MINUTES)
                                  }
                                  disabledLabel={
                                    relevantSession.status === "completed"
                                      ? "Session ended"
                                      : getJoinOpensMessage(SESSION_JOIN_LEAD_MINUTES)
                                  }
                                  align="start"
                                  showMeta={false}
                                  className="w-full sm:w-auto"
                                />
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <Link href={`/student/classes/${cls.id}`}>
                        <Button variant="outline" className="w-full">
                          View Class
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
