import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getEffectiveSessionMeetingSettings } from "@/lib/attendance-utils"
import { formatClassScheduleTime } from "@/lib/class-schedule"
import { prisma } from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SessionForm } from "@/components/teacher/sessions/session-form"

interface EditSessionPageProps {
  params: {
    sessionId: string
  }
}

export async function generateMetadata({
  params,
}: EditSessionPageProps): Promise<Metadata> {
  return {
    title: "Edit Session - Teacher - AcademyFlow",
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
        include: {
          course: {
            select: {
              code: true,
              name: true,
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

  if (teacherProfile) {
    const teacherUser = await prisma.user.findUnique({
      where: { id: teacherProfile.userId },
    })

    if (teacherUser?.academyId !== classSession.class.academyId) {
      return null
    }
  } else if (session.user.role === "admin") {
    if (session.user.academyId !== classSession.class.academyId) {
      return null
    }
  }

  return classSession
}

export default async function EditSessionPage({
  params,
}: EditSessionPageProps) {
  const session = await getServerSession(authOptions)

  if (
    !session?.user ||
    (session.user.role !== "teacher" && session.user.role !== "admin")
  ) {
    redirect("/login")
  }

  if (session.user.role === "teacher") {
    redirect(`/teacher/sessions/${params.sessionId}`)
  }

  const classSession = await fetchSessionData(params.sessionId)

  if (!classSession) {
    notFound()
  }

  const effectiveMeetingSettings = getEffectiveSessionMeetingSettings({
    sessionMeetingPlatform: classSession.meetingPlatform,
    sessionMeetingLink: classSession.meetingLink,
    classMeetingPlatform: classSession.class.defaultMeetingPlatform,
    classMeetingLink: classSession.class.defaultMeetingLink,
  })

  const initialData = {
    id: classSession.id,
    title: classSession.title || "",
    sessionDate: classSession.sessionDate.toISOString(),
    startTime: classSession.startTime.toISOString(),
    endTime: classSession.endTime.toISOString(),
    meetingLink: effectiveMeetingSettings.link || "",
    meetingPlatform: effectiveMeetingSettings.platform as
      | "zoom"
      | "google_meet"
      | "teams"
      | "in_person",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/teacher/sessions/${params.sessionId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Session</h2>
          <p className="text-muted-foreground">
            {classSession.class.name} - {classSession.class.course.code}:{" "}
            {classSession.class.course.name}
          </p>
        </div>
      </div>

      <SessionForm
        classId={classSession.classId}
        initialData={initialData}
        classDefaults={{
          scheduleStartTime: formatClassScheduleTime(
            classSession.class.scheduleStartTime
          ),
          scheduleEndTime: formatClassScheduleTime(
            classSession.class.scheduleEndTime
          ),
          defaultMeetingPlatform: classSession.class.defaultMeetingPlatform,
          defaultMeetingLink: classSession.class.defaultMeetingLink,
          lateThresholdMinutes: classSession.class.lateThresholdMinutes,
        }}
        isEditing
      />
    </div>
  )
}
