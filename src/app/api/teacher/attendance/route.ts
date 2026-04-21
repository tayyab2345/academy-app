import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { notifyAttendanceMarked } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"
import {
  buildTeacherManualAttendanceSession,
  getTeacherAttendanceDayBounds,
  getTeacherAttendanceSaveContext,
  normalizeTeacherAttendanceDateInput,
} from "@/lib/teacher/teacher-attendance-data"

const attendanceStatusSchema = z.enum(["present", "absent", "late", "excused"])

const saveTeacherAttendanceSchema = z.object({
  classId: z.string().min(1),
  date: z.string().min(1),
  attendance: z.array(
    z.object({
      studentProfileId: z.string().min(1),
      status: attendanceStatusSchema,
      notes: z.string().optional(),
    })
  ),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = saveTeacherAttendanceSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const dateInput = normalizeTeacherAttendanceDateInput(validated.data.date)
    const access = await getTeacherAttendanceSaveContext({
      userId: session.user.id,
      classId: validated.data.classId,
      dateInput,
    })

    if (!access) {
      return NextResponse.json(
        { error: "You are not assigned to this class" },
        { status: 403 }
      )
    }

    const allowedStudentIds = new Set(access.activeStudentProfileIds)
    const invalidStudentIds = validated.data.attendance
      .map((record) => record.studentProfileId)
      .filter((studentProfileId) => !allowedStudentIds.has(studentProfileId))

    if (invalidStudentIds.length > 0) {
      return NextResponse.json(
        { error: "One or more students are not enrolled in this class" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      let attendanceSession = access.attendanceSession

      if (!attendanceSession) {
        const { start, end } = getTeacherAttendanceDayBounds(dateInput)

        const existingSameDaySession = await tx.classSession.findFirst({
          where: {
            classId: validated.data.classId,
            sessionDate: {
              gte: start,
              lte: end,
            },
          },
          select: {
            id: true,
            title: true,
            status: true,
            sessionDate: true,
            startTime: true,
            endTime: true,
            _count: {
              select: {
                attendances: true,
              },
            },
          },
          orderBy: {
            startTime: "asc",
          },
        })

        attendanceSession =
          existingSameDaySession ||
          (await tx.classSession.create({
            data: buildTeacherManualAttendanceSession({
              classId: validated.data.classId,
              dateInput,
            }),
            select: {
              id: true,
              title: true,
              status: true,
              sessionDate: true,
              startTime: true,
              endTime: true,
              _count: {
                select: {
                  attendances: true,
                },
              },
            },
          }))
      }

      const existingAttendance = await tx.attendance.findMany({
        where: {
          classSessionId: attendanceSession.id,
          studentProfileId: {
            in: validated.data.attendance.map((record) => record.studentProfileId),
          },
        },
        select: {
          studentProfileId: true,
          status: true,
        },
      })

      const existingAttendanceMap = new Map(
        existingAttendance.map((record) => [record.studentProfileId, record.status])
      )

      await Promise.all(
        validated.data.attendance.map((record) =>
          tx.attendance.upsert({
            where: {
              classSessionId_studentProfileId: {
                classSessionId: attendanceSession.id,
                studentProfileId: record.studentProfileId,
              },
            },
            update: {
              status: record.status,
              notes: record.notes,
              markedByTeacherId: access.teacherProfileId,
              markedAt: new Date(),
            },
            create: {
              classSessionId: attendanceSession.id,
              studentProfileId: record.studentProfileId,
              status: record.status,
              notes: record.notes,
              markedByTeacherId: access.teacherProfileId,
            },
          })
        )
      )

      const notifyRecords = validated.data.attendance.filter((record) => {
        if (record.status !== "absent" && record.status !== "late") {
          return false
        }

        return existingAttendanceMap.get(record.studentProfileId) !== record.status
      })

      return {
        attendanceSessionId: attendanceSession.id,
        notifyRecords,
      }
    })

    const notificationResults = await Promise.allSettled(
      result.notifyRecords.map((record) =>
        notifyAttendanceMarked(
          result.attendanceSessionId,
          record.studentProfileId,
          record.status
        )
      )
    )

    for (const notificationResult of notificationResults) {
      if (notificationResult.status === "rejected") {
        console.error(
          "Failed to send attendance notification:",
          notificationResult.reason
        )
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: result.attendanceSessionId,
      savedCount: validated.data.attendance.length,
    })
  } catch (error) {
    console.error("Failed to save teacher attendance:", error)
    return NextResponse.json(
      { error: "Failed to save attendance" },
      { status: 500 }
    )
  }
}
