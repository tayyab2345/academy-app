import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

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

    const attendanceDateFilter =
      periodStart && periodEnd
        ? {
            sessionDate: {
              gte: new Date(periodStart),
              lte: new Date(periodEnd),
            },
          }
        : {}

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentProfileId: params.studentId,
        classSession: {
          classId: params.classId,
          ...attendanceDateFilter,
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

    const recentSessions = await prisma.classSession.findMany({
      where: {
        classId: params.classId,
        ...(periodStart && periodEnd
          ? {
              sessionDate: {
                gte: new Date(periodStart),
                lte: new Date(periodEnd),
              },
            }
          : {}),
      },
      orderBy: {
        sessionDate: "desc",
      },
      take: 5,
      include: {
        attendances: {
          where: {
            studentProfileId: params.studentId,
          },
        },
      },
    })

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
      attendance: attendanceSummary,
      recentSessions: recentSessions.map((session) => ({
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
