import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getEffectiveSessionMeetingSettings } from "@/lib/attendance-utils"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSessionSchema = z.object({
  title: z.string().optional().nullable(),
  sessionDate: z.string().or(z.date()).optional(),
  startTime: z.string().or(z.date()).optional(),
  endTime: z.string().or(z.date()).optional(),
  meetingLink: z.string().url().optional().nullable().or(z.literal("")),
  meetingPlatform: z
    .enum(["zoom", "google_meet", "teams", "in_person"])
    .optional(),
  status: z.enum(["scheduled", "ongoing", "completed", "cancelled"]).optional(),
})

async function verifySessionAccess(sessionId: string, userId: string, role: string) {
  const classSession = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        select: {
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
        },
      },
    },
  })

  if (!classSession) {
    return { ok: false as const, status: 404, error: "Session not found" }
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
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

    const teacherUser = await prisma.user.findUnique({
      where: { id: teacherProfile.userId },
      select: { academyId: true },
    })

    if (
      (!classTeacher && role !== "admin") ||
      teacherUser?.academyId !== classSession.class.academyId
    ) {
      return {
        ok: false as const,
        status: 403,
        error: "You are not assigned to this class",
      }
    }
  } else if (role !== "admin") {
    return { ok: false as const, status: 403, error: "Unauthorized" }
  }

  return { ok: true as const, classSession }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = await verifySessionAccess(
      params.sessionId,
      session.user.id,
      session.user.role
    )

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    return NextResponse.json({ session: access.classSession })
  } catch (error) {
    console.error("Failed to fetch session:", error)
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = await verifySessionAccess(
      params.sessionId,
      session.user.id,
      session.user.role
    )

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await req.json()
    const validated = updateSessionSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { ...validated.data }

    if (updateData.sessionDate) {
      updateData.sessionDate = new Date(updateData.sessionDate as string | Date)
    }
    if (updateData.startTime) {
      updateData.startTime = new Date(updateData.startTime as string | Date)
    }
    if (updateData.endTime) {
      updateData.endTime = new Date(updateData.endTime as string | Date)
    }
    if (updateData.meetingLink === "") {
      updateData.meetingLink = null
    }

    const startTime =
      (updateData.startTime as Date | undefined) ?? access.classSession.startTime
    const endTime =
      (updateData.endTime as Date | undefined) ?? access.classSession.endTime
    const requestedMeetingPlatform =
      (updateData.meetingPlatform as string | undefined) ??
      access.classSession.meetingPlatform
    const requestedMeetingLink =
      (updateData.meetingLink as string | null | undefined) ??
      access.classSession.meetingLink

    if (endTime.getTime() <= startTime.getTime()) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }

    const effectiveMeetingSettings = getEffectiveSessionMeetingSettings({
      sessionMeetingPlatform: requestedMeetingPlatform,
      sessionMeetingLink: requestedMeetingLink,
      classMeetingPlatform: access.classSession.class.defaultMeetingPlatform,
      classMeetingLink: access.classSession.class.defaultMeetingLink,
    })

    if (
      effectiveMeetingSettings.platform !== "in_person" &&
      !effectiveMeetingSettings.link
    ) {
      return NextResponse.json(
        {
          error:
            "Add a session meeting link or match the class default online platform before saving.",
        },
        { status: 400 }
      )
    }

    const updatedSession = await prisma.classSession.update({
      where: { id: params.sessionId },
      data: updateData,
    })

    return NextResponse.json({ session: updatedSession })
  } catch (error) {
    console.error("Failed to update session:", error)
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = await verifySessionAccess(
      params.sessionId,
      session.user.id,
      session.user.role
    )

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    await prisma.classSession.delete({
      where: { id: params.sessionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete session:", error)
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    )
  }
}
