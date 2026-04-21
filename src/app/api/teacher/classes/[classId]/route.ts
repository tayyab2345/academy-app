import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!teacherProfile && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 403 }
      )
    }

    if (teacherProfile) {
      const classTeacher = await prisma.classTeacher.findUnique({
        where: {
          classId_teacherProfileId: {
            classId: params.classId,
            teacherProfileId: teacherProfile.id,
          },
        },
      })

      if (!classTeacher && session.user.role !== "admin") {
        return NextResponse.json(
          { error: "You are not assigned to this class" },
          { status: 403 }
        )
      }
    }

    const classData = await prisma.class.findUnique({
      where: {
        id: params.classId,
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            subjectArea: true,
            gradeLevel: true,
          },
        },
        teachers: {
          include: {
            teacherProfile: {
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
        _count: {
          select: {
            enrollments: true,
            sessions: true,
          },
        },
      },
    })

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    if (teacherProfile) {
      const teacherUser = await prisma.user.findUnique({
        where: { id: teacherProfile.userId },
      })

      if (teacherUser?.academyId !== classData.academyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
    } else if (session.user.role === "admin") {
      if (session.user.academyId !== classData.academyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
    }

    return NextResponse.json({ class: classData })
  } catch (error) {
    console.error("Failed to fetch class:", error)
    return NextResponse.json(
      { error: "Failed to fetch class" },
      { status: 500 }
    )
  }
}
