import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import { prisma } from "@/lib/prisma"
import { getTeacherClassSessionsPageData } from "@/lib/teacher/teacher-class-data"
import { z } from "zod"

const createSessionSchema = z.object({
  title: z.string().optional(),
  sessionDate: z.string().or(z.date()),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  meetingLink: z.string().url().optional().or(z.literal("")),
  meetingPlatform: z
    .enum(["zoom", "google_meet", "teams", "in_person"])
    .default("in_person"),
})

async function verifyClassAccess(classId: string, userId: string, role: string) {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
  })

  if (!teacherProfile && role !== "admin") {
    return { ok: false as const, status: 403, error: "Teacher profile not found" }
  }

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      academyId: true,
    },
  })

  if (!classData) {
    return { ok: false as const, status: 404, error: "Class not found" }
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

    const teacherUser = await prisma.user.findUnique({
      where: { id: teacherProfile.userId },
      select: { academyId: true },
    })

    if (
      (!classTeacher && role !== "admin") ||
      teacherUser?.academyId !== classData.academyId
    ) {
      return {
        ok: false as const,
        status: 403,
        error: "You are not assigned to this class",
      }
    }
  }

  return { ok: true as const, teacherProfile, classData }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status") || ""

    if (!status) {
      const data = await getTeacherClassSessionsPageData({
        userId: session.user.id,
        classId: params.classId,
        page,
        limit,
      })

      if (!data) {
        return NextResponse.json(
          { error: "You are not assigned to this class" },
          { status: 403 }
        )
      }

      return NextResponse.json(
        {
          sessions: data.sessions,
          total: data.total,
          page: data.page,
          totalPages: data.totalPages,
        },
        {
          headers: getPrivateCacheHeaders(30),
        }
      )
    }

    const access = await verifyClassAccess(
      params.classId,
      session.user.id,
      session.user.role
    )

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const where: {
      classId: string
      status?: "scheduled" | "ongoing" | "completed" | "cancelled"
    } = {
      classId: params.classId,
    }

    if (status) {
      where.status = status as "scheduled" | "ongoing" | "completed" | "cancelled"
    }

    const [sessions, total] = await Promise.all([
      prisma.classSession.findMany({
        where,
        include: {
          _count: {
            select: {
              attendances: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
      }),
      prisma.classSession.count({ where }),
    ])

    return NextResponse.json(
      {
        sessions,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      {
        headers: getPrivateCacheHeaders(30),
      }
    )
  } catch (error) {
    console.error("Failed to fetch sessions:", error)
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = await verifyClassAccess(
      params.classId,
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
    const validated = createSessionSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const sessionDate = new Date(validated.data.sessionDate)
    const startTime = new Date(validated.data.startTime)
    const endTime = new Date(validated.data.endTime)

    if (endTime.getTime() <= startTime.getTime()) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }

    const newSession = await prisma.classSession.create({
      data: {
        classId: params.classId,
        title: validated.data.title,
        sessionDate,
        startTime,
        endTime,
        meetingLink: validated.data.meetingLink || null,
        meetingPlatform: validated.data.meetingPlatform,
        status: "scheduled",
      },
    })

    return NextResponse.json({ session: newSession }, { status: 201 })
  } catch (error) {
    console.error("Failed to create session:", error)
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    )
  }
}
