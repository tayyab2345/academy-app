import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  calculateAttendanceStatus,
  getEffectiveSessionMeetingSettings,
} from "@/lib/attendance-utils"
import { notifyStudentLateJoin } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!studentProfile) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 403 }
      )
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: params.sessionId },
      select: {
        id: true,
        classId: true,
        startTime: true,
        status: true,
        meetingLink: true,
        meetingPlatform: true,
        class: {
          select: {
            lateThresholdMinutes: true,
            defaultMeetingLink: true,
            defaultMeetingPlatform: true,
          },
        },
      },
    })

    if (!classSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentProfileId_classId: {
          studentProfileId: studentProfile.id,
          classId: classSession.classId,
        },
      },
    })

    if (!enrollment || enrollment.status !== "active") {
      return NextResponse.json(
        { error: "You are not enrolled in this class" },
        { status: 403 }
      )
    }

    if (
      classSession.status !== "scheduled" &&
      classSession.status !== "ongoing"
    ) {
      return NextResponse.json(
        { error: "This session is not open for joining" },
        { status: 400 }
      )
    }

    const effectiveMeetingSettings = getEffectiveSessionMeetingSettings({
      sessionMeetingPlatform: classSession.meetingPlatform,
      sessionMeetingLink: classSession.meetingLink,
      classMeetingPlatform: classSession.class.defaultMeetingPlatform,
      classMeetingLink: classSession.class.defaultMeetingLink,
    })

    if (
      effectiveMeetingSettings.platform !== "in_person" &&
      !effectiveMeetingSettings.link
    ) {
      return NextResponse.json(
        { error: "Meeting link has not been added yet" },
        { status: 400 }
      )
    }

    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        classSessionId_studentProfileId: {
          classSessionId: params.sessionId,
          studentProfileId: studentProfile.id,
        },
      },
      select: {
        id: true,
        status: true,
        joinTime: true,
        lateMinutes: true,
        markedAt: true,
      },
    })

    if (existingAttendance?.joinTime) {
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        attendance: existingAttendance,
        meetingLink: effectiveMeetingSettings.link,
        meetingPlatform: effectiveMeetingSettings.platform,
      })
    }

    const joinTime = new Date()
    const joinResult = calculateAttendanceStatus(
      classSession.startTime,
      joinTime,
      classSession.class.lateThresholdMinutes
    )

    const attendance = await prisma.attendance.upsert({
      where: {
        classSessionId_studentProfileId: {
          classSessionId: params.sessionId,
          studentProfileId: studentProfile.id,
        },
      },
      update: {
        joinTime,
        status: joinResult.status === "late" ? "late" : "present",
        lateMinutes: joinResult.lateMinutes,
        markedAt: joinTime,
        markedByTeacherId: null,
      },
      create: {
        classSessionId: params.sessionId,
        studentProfileId: studentProfile.id,
        joinTime,
        status: joinResult.status === "late" ? "late" : "present",
        lateMinutes: joinResult.lateMinutes,
      },
    })

    if (joinResult.status === "late") {
      await notifyStudentLateJoin(
        params.sessionId,
        studentProfile.id,
        joinResult.lateMinutes
      )
    }

    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      attendance,
      joinTracking: joinResult,
      meetingLink: effectiveMeetingSettings.link,
      meetingPlatform: effectiveMeetingSettings.platform,
    })
  } catch (error) {
    console.error("Failed to record join:", error)
    return NextResponse.json(
      { error: "Failed to record join" },
      { status: 500 }
    )
  }
}
