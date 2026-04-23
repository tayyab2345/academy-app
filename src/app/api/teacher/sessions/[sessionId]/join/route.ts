import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  calculateSessionJoinStatus,
  getEffectiveSessionMeetingSettings,
} from "@/lib/attendance-utils"
import { notifyTeacherLateJoin } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!teacherProfile) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
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
            defaultMeetingLink: true,
            defaultMeetingPlatform: true,
          },
        },
      },
    })

    if (!classSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const classTeacher = await prisma.classTeacher.findUnique({
      where: {
        classId_teacherProfileId: {
          classId: classSession.classId,
          teacherProfileId: teacherProfile.id,
        },
      },
      select: { id: true },
    })

    if (!classTeacher) {
      return NextResponse.json(
        { error: "You are not assigned to this class" },
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

    const existingJoin = await prisma.teacherSessionJoin.findUnique({
      where: {
        classSessionId_teacherProfileId: {
          classSessionId: params.sessionId,
          teacherProfileId: teacherProfile.id,
        },
      },
    })

    if (existingJoin) {
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        teacherJoin: existingJoin,
        meetingLink: effectiveMeetingSettings.link,
        meetingPlatform: effectiveMeetingSettings.platform,
      })
    }

    const joinTime = new Date()
    const joinResult = calculateSessionJoinStatus(classSession.startTime, joinTime)

    const teacherJoin = await prisma.teacherSessionJoin.create({
      data: {
        classSessionId: params.sessionId,
        teacherProfileId: teacherProfile.id,
        joinTime,
        status: joinResult.status,
        lateMinutes: joinResult.lateMinutes,
      },
    })

    if (joinResult.status === "late") {
      await notifyTeacherLateJoin(
        params.sessionId,
        teacherProfile.id,
        joinResult.lateMinutes
      )
    }

    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      teacherJoin,
      joinTracking: joinResult,
      meetingLink: effectiveMeetingSettings.link,
      meetingPlatform: effectiveMeetingSettings.platform,
    })
  } catch (error) {
    console.error("Failed to record teacher join:", error)
    return NextResponse.json(
      { error: "Failed to record teacher join" },
      { status: 500 }
    )
  }
}
