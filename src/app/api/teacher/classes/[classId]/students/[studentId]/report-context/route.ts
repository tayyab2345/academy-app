import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function parseDateRange(start: string | null, end: string | null) {
  if (!start || !end) {
    return null
  }

  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate = new Date(`${end}T23:59:59.999Z`)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null
  }

  return {
    gte: startDate,
    lte: endDate,
  }
}

function toDateKey(value: Date) {
  return value.toISOString().split("T")[0]
}

function toDayName(value: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(value)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string; studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!teacherProfile) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 403 }
      )
    }

    const classTeacher = await prisma.classTeacher.findUnique({
      where: {
        classId_teacherProfileId: {
          classId: params.classId,
          teacherProfileId: teacherProfile.id,
        },
      },
    })

    if (!classTeacher) {
      return NextResponse.json(
        { error: "You are not assigned to this class" },
        { status: 403 }
      )
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentProfileId_classId: {
          studentProfileId: params.studentId,
          classId: params.classId,
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: "Student is not enrolled in this class" },
        { status: 404 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const periodStart = searchParams.get("periodStart")
    const periodEnd = searchParams.get("periodEnd")
    const dateRange = parseDateRange(periodStart, periodEnd)

    const sessionDateFilter = dateRange ? { sessionDate: dateRange } : {}

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentProfileId: params.studentId,
        classSession: {
          classId: params.classId,
          ...sessionDateFilter,
        },
      },
      include: {
        classSession: true,
      },
    })

    const attendanceSummary = {
      totalSessions: attendanceRecords.length,
      present: attendanceRecords.filter((attendance) => attendance.status === "present")
        .length,
      absent: attendanceRecords.filter((attendance) => attendance.status === "absent")
        .length,
      late: attendanceRecords.filter((attendance) => attendance.status === "late")
        .length,
      excused: attendanceRecords.filter(
        (attendance) => attendance.status === "excused"
      ).length,
    }

    const sessionsInPeriod = await prisma.classSession.findMany({
      where: {
        classId: params.classId,
        ...sessionDateFilter,
      },
      orderBy: {
        sessionDate: "asc",
      },
      include: {
        attendances: {
          where: {
            studentProfileId: params.studentId,
          },
        },
      },
    })

    const dailyReports = dateRange
      ? await prisma.report.findMany({
          where: {
            classId: params.classId,
            studentProfileId: params.studentId,
            teacherProfileId: teacherProfile.id,
            reportType: "daily",
            reportDate: dateRange,
          },
          orderBy: {
            updatedAt: "desc",
          },
          include: {
            sections: {
              orderBy: {
                orderIndex: "asc",
              },
              select: {
                id: true,
                sectionType: true,
                content: true,
                contentJson: true,
                rating: true,
                orderIndex: true,
              },
            },
          },
        })
      : []

    const uniqueDailyReports = Array.from(
      dailyReports
        .reduce((reportsByDate, report) => {
          const dateKey = toDateKey(report.reportDate)

          if (!reportsByDate.has(dateKey)) {
            reportsByDate.set(dateKey, report)
          }

          return reportsByDate
        }, new Map<string, (typeof dailyReports)[number]>())
        .values()
    ).sort((left, right) => left.reportDate.getTime() - right.reportDate.getTime())

    const student = await prisma.studentProfile.findUnique({
      where: { id: params.studentId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const classInfo = await prisma.class.findUnique({
      where: { id: params.classId },
      include: {
        course: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      attendance: {
        ...attendanceSummary,
        sessions: sessionsInPeriod.map((session) => {
          const attendance = session.attendances[0] || null

          return {
            id: session.id,
            title: session.title,
            date: toDateKey(session.sessionDate),
            dayName: toDayName(session.sessionDate),
            startTime: session.startTime.toISOString(),
            endTime: session.endTime.toISOString(),
            sessionStatus: session.status,
            attendance: attendance
              ? {
                  id: attendance.id,
                  status: attendance.status,
                  lateMinutes: attendance.lateMinutes,
                  notes: attendance.notes,
                  joinTime: attendance.joinTime?.toISOString() ?? null,
                }
              : null,
          }
        }),
        dailyReports: uniqueDailyReports.map((report) => ({
          id: report.id,
          date: toDateKey(report.reportDate),
          reportDate: report.reportDate.toISOString(),
          updatedAt: report.updatedAt.toISOString(),
          sections: report.sections.map((section) => ({
            id: section.id,
            sectionType: section.sectionType,
            content: section.content,
            contentJson: section.contentJson,
            rating: section.rating,
            orderIndex: section.orderIndex,
          })),
        })),
      },
      recentSessions: sessionsInPeriod.slice(-5).map((session) => ({
        id: session.id,
        title: session.title,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        status: session.status,
        attendance: session.attendances[0] || null,
      })),
      student,
      class: classInfo,
    })
  } catch (error) {
    console.error("Failed to fetch report context:", error)
    return NextResponse.json(
      { error: "Failed to fetch report context" },
      { status: 500 }
    )
  }
}
