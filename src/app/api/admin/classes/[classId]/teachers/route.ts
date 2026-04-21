import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const assignTeacherSchema = z.object({
  teacherProfileId: z.string().min(1, "Teacher is required"),
  role: z.enum(["primary", "assistant"]).default("primary"),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = assignTeacherSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const classData = await prisma.class.findUnique({
      where: { id: params.classId },
    })

    if (!classData || classData.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: validated.data.teacherProfileId },
      include: {
        user: true,
      },
    })

    if (!teacher || teacher.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    const existingAssignment = await prisma.classTeacher.findUnique({
      where: {
        classId_teacherProfileId: {
          classId: params.classId,
          teacherProfileId: validated.data.teacherProfileId,
        },
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Teacher is already assigned to this class" },
        { status: 400 }
      )
    }

    if (validated.data.role === "primary") {
      const primaryTeacher = await prisma.classTeacher.findFirst({
        where: {
          classId: params.classId,
          role: "primary",
        },
      })

      if (primaryTeacher) {
        return NextResponse.json(
          { error: "This class already has a primary teacher" },
          { status: 400 }
        )
      }
    }

    const assignment = await prisma.classTeacher.create({
      data: {
        classId: params.classId,
        teacherProfileId: validated.data.teacherProfileId,
        role: validated.data.role,
      },
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
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error("Failed to assign teacher:", error)
    return NextResponse.json(
      { error: "Failed to assign teacher" },
      { status: 500 }
    )
  }
}
