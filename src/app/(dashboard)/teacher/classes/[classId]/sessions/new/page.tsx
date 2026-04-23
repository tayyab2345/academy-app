import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  buildDateTimeFromDateInputAndTime,
  formatClassScheduleTime,
} from "@/lib/class-schedule"
import { prisma } from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SessionForm } from "@/components/teacher/sessions/session-form"

interface NewSessionPageProps {
  params: {
    classId: string
  }
}

export async function generateMetadata({
  params,
}: NewSessionPageProps): Promise<Metadata> {
  return {
    title: "Create Session - Teacher - AcademyFlow",
  }
}

async function verifyClassAccess(classId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!teacherProfile && session.user.role !== "admin") {
    return null
  }

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      course: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  })

  if (!classData) {
    return null
  }

  if (teacherProfile) {
    const classTeacher = await prisma.classTeacher.findUnique({
      where: {
        classId_teacherProfileId: {
          classId,
          teacherProfileId: teacherProfile.id,
        },
      },
    })

    if (!classTeacher && session.user.role !== "admin") {
      return null
    }
  }

  if (teacherProfile) {
    const teacherUser = await prisma.user.findUnique({
      where: { id: teacherProfile.userId },
    })

    if (teacherUser?.academyId !== classData.academyId) {
      return null
    }
  } else if (session.user.role === "admin") {
    if (session.user.academyId !== classData.academyId) {
      return null
    }
  }

  return classData
}

export default async function NewSessionPage({
  params,
}: NewSessionPageProps) {
  const session = await getServerSession(authOptions)

  if (
    !session?.user ||
    (session.user.role !== "teacher" && session.user.role !== "admin")
  ) {
    redirect("/login")
  }

  if (session.user.role === "teacher") {
    redirect(`/teacher/classes/${params.classId}/sessions`)
  }

  const classData = await verifyClassAccess(params.classId)

  if (!classData) {
    notFound()
  }

  const todayDateInput = new Date().toISOString().slice(0, 10)
  const defaultStartDateTime = buildDateTimeFromDateInputAndTime(
    todayDateInput,
    classData.scheduleStartTime,
    9,
    0
  )
  const defaultEndDateTime = classData.scheduleEndTime
    ? buildDateTimeFromDateInputAndTime(
        todayDateInput,
        classData.scheduleEndTime,
        defaultStartDateTime.getHours() + 1,
        defaultStartDateTime.getMinutes()
      )
    : new Date(defaultStartDateTime.getTime() + 60 * 60 * 1000)
  const initialData = {
    sessionDate: defaultStartDateTime.toISOString(),
    startTime: defaultStartDateTime.toISOString(),
    endTime: defaultEndDateTime.toISOString(),
    meetingPlatform: classData.defaultMeetingPlatform,
    meetingLink: classData.defaultMeetingLink || "",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/teacher/classes/${params.classId}/sessions`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create New Session</h2>
          <p className="text-muted-foreground">
            {classData.name} - {classData.course.code}: {classData.course.name}
          </p>
        </div>
      </div>

      <SessionForm
        classId={params.classId}
        initialData={initialData}
        classDefaults={{
          scheduleStartTime: formatClassScheduleTime(classData.scheduleStartTime),
          scheduleEndTime: formatClassScheduleTime(classData.scheduleEndTime),
          defaultMeetingPlatform: classData.defaultMeetingPlatform,
          defaultMeetingLink: classData.defaultMeetingLink,
          lateThresholdMinutes: classData.lateThresholdMinutes,
        }}
      />
    </div>
  )
}
