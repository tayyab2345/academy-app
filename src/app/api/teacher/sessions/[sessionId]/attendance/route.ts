import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { notifyAttendanceMarked } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const markAttendanceSchema = z.object({
  attendance: z.array(
    z.object({
      studentProfileId: z.string(),
      status: z.enum(["present", "absent", "late", "excused"]),
      notes: z.string().optional(),
    })
  ),
})

const updateAttendanceSchema = z.object({
  status: z.enum(["present", "absent", "late", "excused"]),
  notes: z.string().optional(),
})

async function verifyAttendanceAccess(sessionId: string, userId: string) {
  const classSession = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: {
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
    return { ok: false as const, status: 404, error: "Session not found" }
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
  })

  if (!teacherProfile) {
    return {
      ok: false as const,
      status: 403,
      error: "Teacher profile not found",
    }
  }

  const classTeacher = await prisma.classTeacher.findUnique({
    where: {
      classId_teacherProfileId: {
        classId: classSession.classId,
        teacherProfileId: teacherProfile.id,
      },
    },
  })

  if (!classTeacher) {
    return {
      ok: false as const,
      status: 403,
      error: "You are not assigned to this class",
    }
  }

  return { ok: true as const, classSession, teacherProfile }
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

    const access = await verifyAttendanceAccess(params.sessionId, session.user.id)

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classSessionId: params.sessionId,
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

    const students = access.classSession.class.enrollments.map((enrollment) => ({
      studentProfile: enrollment.studentProfile,
      attendance: attendanceMap.get(enrollment.studentProfile.id) || null,
    }))

    return NextResponse.json({
      session: access.classSession,
      students,
      summary: {
        total: students.length,
        present: attendanceRecords.filter((a) => a.status === "present").length,
        absent: attendanceRecords.filter((a) => a.status === "absent").length,
        late: attendanceRecords.filter((a) => a.status === "late").length,
        excused: attendanceRecords.filter((a) => a.status === "excused").length,
        unmarked: students.length - attendanceRecords.length,
      },
    })
  } catch (error) {
    console.error("Failed to fetch attendance:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = await verifyAttendanceAccess(params.sessionId, session.user.id)

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await req.json()
    const validated = markAttendanceSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const results = await prisma.$transaction(
      validated.data.attendance.map((record) =>
        prisma.attendance.upsert({
          where: {
            classSessionId_studentProfileId: {
              classSessionId: params.sessionId,
              studentProfileId: record.studentProfileId,
            },
          },
          update: {
            status: record.status,
            notes: record.notes,
            markedByTeacherId: access.teacherProfile.id,
            markedAt: new Date(),
          },
          create: {
            classSessionId: params.sessionId,
            studentProfileId: record.studentProfileId,
            status: record.status,
            notes: record.notes,
            markedByTeacherId: access.teacherProfile.id,
          },
        })
      )
    )

    const notifications = validated.data.attendance
      .filter(
        (record) => record.status === "absent" || record.status === "late"
      )
      .map((record) =>
        notifyAttendanceMarked(
          params.sessionId,
          record.studentProfileId,
          record.status
        )
      )

    if (notifications.length > 0) {
      const notificationResults = await Promise.allSettled(notifications)

      for (const result of notificationResults) {
        if (result.status === "rejected") {
          console.error(
            "Failed to send attendance notification:",
            result.reason
          )
        }
      }
    }

    return NextResponse.json({ success: true, count: results.length })
  } catch (error) {
    console.error("Failed to mark attendance:", error)
    return NextResponse.json(
      { error: "Failed to mark attendance" },
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

    const { searchParams } = new URL(req.url)
    const studentProfileId = searchParams.get("studentProfileId")

    if (!studentProfileId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      )
    }

    const access = await verifyAttendanceAccess(params.sessionId, session.user.id)

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await req.json()
    const validated = updateAttendanceSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        classSessionId_studentProfileId: {
          classSessionId: params.sessionId,
          studentProfileId,
        },
      },
      update: {
        status: validated.data.status,
        notes: validated.data.notes,
        markedByTeacherId: access.teacherProfile.id,
        markedAt: new Date(),
      },
      create: {
        classSessionId: params.sessionId,
        studentProfileId,
        status: validated.data.status,
        notes: validated.data.notes,
        markedByTeacherId: access.teacherProfile.id,
      },
    })

    if (validated.data.status === "absent" || validated.data.status === "late") {
      try {
        await notifyAttendanceMarked(
          params.sessionId,
          studentProfileId,
          validated.data.status
        )
      } catch (notificationError) {
        console.error(
          "Failed to send attendance notification:",
          notificationError
        )
      }
    }

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error("Failed to update attendance:", error)
    return NextResponse.json(
      { error: "Failed to update attendance" },
      { status: 500 }
    )
  }
}
