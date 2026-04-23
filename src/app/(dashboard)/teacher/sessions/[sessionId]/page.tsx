import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AttendanceGrid } from "@/components/teacher/attendance/attendance-grid"
import { MeetingLinkButton } from "@/components/sessions/meeting-link-button"
import {
  formatLateThresholdLabel,
  getEffectiveSessionMeetingSettings,
  getMeetingPlatformLabel,
  getSessionJoinWindowState,
  getSessionStatusBadge,
  SESSION_JOIN_LEAD_MINUTES,
} from "@/lib/attendance-utils"
import { TeacherJoinSessionCard } from "@/components/teacher/sessions/teacher-join-session-card"
import { TeacherJoinButton } from "@/components/teacher/sessions/teacher-join-button"

interface SessionDetailPageProps {
  params: {
    sessionId: string
  }
}

async function fetchSessionData(sessionId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const classSession = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          academyId: true,
          defaultMeetingLink: true,
          defaultMeetingPlatform: true,
          lateThresholdMinutes: true,
          course: {
            select: {
              code: true,
              name: true,
            },
          },
          enrollments: {
            where: { status: "active" },
            include: {
              studentProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!classSession) {
    return null
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (teacherProfile) {
    const classTeacher = await prisma.classTeacher.findUnique({
      where: {
        classId_teacherProfileId: {
          classId: classSession.classId,
          teacherProfileId: teacherProfile.id,
        },
      },
    })

    if (!classTeacher && session.user.role !== "admin") {
      return null
    }
  } else if (session.user.role !== "admin") {
    return null
  }

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      classSessionId: sessionId,
    },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      markedByTeacher: {
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
  })

  const attendanceMap = new Map(
    attendanceRecords.map((record) => [record.studentProfileId, record])
  )

  const students = classSession.class.enrollments.map((enrollment) => ({
    studentProfile: enrollment.studentProfile,
    attendance: attendanceMap.get(enrollment.studentProfile.id) || null,
  }))

  const teacherJoin =
    teacherProfile && session.user.role === "teacher"
      ? await prisma.teacherSessionJoin.findUnique({
          where: {
            classSessionId_teacherProfileId: {
              classSessionId: sessionId,
              teacherProfileId: teacherProfile.id,
            },
          },
          select: {
            joinTime: true,
            status: true,
            lateMinutes: true,
          },
        })
      : null

  return {
    session: classSession,
    students,
    teacherJoin: teacherJoin
      ? {
          joinTime: teacherJoin.joinTime.toISOString(),
          status: teacherJoin.status,
          lateMinutes: teacherJoin.lateMinutes,
        }
      : null,
    canTrackTeacherJoin: session.user.role === "teacher",
  }
}

export async function generateMetadata({
  params,
}: SessionDetailPageProps): Promise<Metadata> {
  const data = await fetchSessionData(params.sessionId)

  if (!data) {
    return { title: "Session Not Found" }
  }

  return {
    title: `${data.session.title || "Session"} - Attendance - AcademyFlow`,
  }
}

export default async function SessionDetailPage({
  params,
}: SessionDetailPageProps) {
  const data = await fetchSessionData(params.sessionId)

  if (!data) {
    notFound()
  }

  const { session: classSession, students, teacherJoin, canTrackTeacherJoin } = data
  const statusBadge = getSessionStatusBadge(classSession.status)
  const effectiveMeetingSettings = getEffectiveSessionMeetingSettings({
    sessionMeetingPlatform: classSession.meetingPlatform,
    sessionMeetingLink: classSession.meetingLink,
    classMeetingPlatform: classSession.class.defaultMeetingPlatform,
    classMeetingLink: classSession.class.defaultMeetingLink,
  })
  const joinWindow = getSessionJoinWindowState({
    startTime: classSession.startTime,
    endTime: classSession.endTime,
    status: classSession.status,
  })

  async function markAttendance(studentId: string, status: string) {
    "use server"

    const authSession = await getServerSession(authOptions)
    if (!authSession?.user) return

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: authSession.user.id },
    })

    if (!teacherProfile) return

    await prisma.attendance.upsert({
      where: {
        classSessionId_studentProfileId: {
          classSessionId: params.sessionId,
          studentProfileId: studentId,
        },
      },
      update: {
        status: status as any,
        markedByTeacherId: teacherProfile.id,
        markedAt: new Date(),
      },
      create: {
        classSessionId: params.sessionId,
        studentProfileId: studentId,
        status: status as any,
        markedByTeacherId: teacherProfile.id,
      },
    })

    revalidatePath(`/teacher/sessions/${params.sessionId}`)
  }

  async function bulkMarkAttendance(status: string) {
    "use server"

    const authSession = await getServerSession(authOptions)
    if (!authSession?.user) return

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: authSession.user.id },
    })

    if (!teacherProfile) return

    const unmarkedStudents = students.filter((student) => !student.attendance)

    await prisma.$transaction(
      unmarkedStudents.map((student) =>
        prisma.attendance.create({
          data: {
            classSessionId: params.sessionId,
            studentProfileId: student.studentProfile.id,
            status: status as any,
            markedByTeacherId: teacherProfile.id,
          },
        })
      )
    )

    revalidatePath(`/teacher/sessions/${params.sessionId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Link href={`/teacher/classes/${classSession.classId}/sessions`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="break-words text-2xl font-bold tracking-tight">
                {classSession.title || "Session Attendance"}
              </h2>
              <Badge variant={statusBadge.variant as any}>
                {statusBadge.label}
              </Badge>
            </div>
            <p className="break-words text-muted-foreground">
              {classSession.class.course.code} - {classSession.class.name}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {canTrackTeacherJoin && (joinWindow.isVisible || teacherJoin) ? (
            <TeacherJoinButton
              sessionId={classSession.id}
              sessionStatus={classSession.status}
              meetingPlatform={effectiveMeetingSettings.platform}
              meetingLink={effectiveMeetingSettings.link}
              initialJoin={teacherJoin}
              showMeta={false}
              align="start"
              className="w-full sm:w-auto"
            />
          ) : canTrackTeacherJoin ? (
            <p className="text-xs text-muted-foreground">
              Join button appears {SESSION_JOIN_LEAD_MINUTES} minutes before class time.
            </p>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(classSession.sessionDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(classSession.startTime).toLocaleTimeString()} -{" "}
                  {new Date(classSession.endTime).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {effectiveMeetingSettings.platform === "in_person" ? (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Video className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{getMeetingPlatformLabel(effectiveMeetingSettings.platform)}</span>
              </div>
              {effectiveMeetingSettings.link && (
                <div className="pt-1">
                  <MeetingLinkButton href={effectiveMeetingSettings.link} />
                </div>
              )}
              {effectiveMeetingSettings.inheritedFromClass ? (
                <p className="text-sm text-muted-foreground">
                  Using the class default meeting link configured by admin.
                </p>
              ) : null}
              {!effectiveMeetingSettings.link &&
              effectiveMeetingSettings.platform !== "in_person" ? (
                <p className="text-sm text-muted-foreground">
                  No meeting link has been added for this session yet.
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Student late rule:{" "}
                {formatLateThresholdLabel(classSession.class.lateThresholdMinutes)}
              </p>
              <p className="text-sm text-muted-foreground">
                This session is synced from the admin class schedule.
              </p>
            </div>
          </div>

          {canTrackTeacherJoin ? (
            <div className="mt-4">
              <TeacherJoinSessionCard
                sessionId={classSession.id}
                sessionStatus={classSession.status}
                meetingPlatform={effectiveMeetingSettings.platform}
                meetingLink={effectiveMeetingSettings.link}
                initialJoin={teacherJoin}
                joinWindowVisible={joinWindow.isVisible || Boolean(teacherJoin)}
                joinWindowMessage={`Join button appears ${SESSION_JOIN_LEAD_MINUTES} minutes before class time.`}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance
          </CardTitle>
          <CardDescription>Mark attendance for this session</CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceGrid
            students={students}
            sessionStatus={classSession.status}
            onMarkAttendance={markAttendance}
            onBulkMark={bulkMarkAttendance}
          />
        </CardContent>
      </Card>
    </div>
  )
}
