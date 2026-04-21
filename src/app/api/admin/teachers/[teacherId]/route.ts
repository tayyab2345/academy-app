import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateTeacherSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  employeeId: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  maxWeeklyHours: z.number().min(1).max(40).optional().nullable(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: params.teacherId },
      include: {
        user: {
          select: {
            id: true,
            academyId: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
            isAcademyOwner: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    if (teacher.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ teacher })
  } catch (error) {
    console.error("Failed to fetch teacher:", error)
    return NextResponse.json(
      { error: "Failed to fetch teacher" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = updateTeacherSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const { password, employeeId, ...updateData } = validated.data

    const existingTeacher = await prisma.teacherProfile.findUnique({
      where: { id: params.teacherId },
      include: { user: true },
    })

    if (!existingTeacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    if (existingTeacher.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (employeeId && employeeId !== existingTeacher.employeeId) {
      const duplicateEmployee = await prisma.teacherProfile.findFirst({
        where: {
          employeeId,
          id: { not: params.teacherId },
        },
      })

      if (duplicateEmployee) {
        return NextResponse.json(
          { error: "Employee ID already exists" },
          { status: 400 }
        )
      }
    }

    const userUpdateData: Record<string, string | null> & {
      passwordHash?: string
    } = {}
    if (updateData.firstName) userUpdateData.firstName = updateData.firstName
    if (updateData.lastName) userUpdateData.lastName = updateData.lastName
    if (updateData.phone !== undefined) userUpdateData.phone = updateData.phone
    if (password) {
      userUpdateData.passwordHash = await bcrypt.hash(password, 10)
    }

    const updatedTeacher = await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: existingTeacher.userId },
          data: userUpdateData,
        })
      }

      const profile = await tx.teacherProfile.update({
        where: { id: params.teacherId },
        data: {
          employeeId: employeeId === null ? null : employeeId,
          qualification: updateData.qualification,
          specialization: updateData.specialization,
          bio: updateData.bio,
          maxWeeklyHours: updateData.maxWeeklyHours,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              isActive: true,
            },
          },
        },
      })

      return profile
    })

    return NextResponse.json({ teacher: updatedTeacher })
  } catch (error) {
    console.error("Failed to update teacher:", error)
    return NextResponse.json(
      { error: "Failed to update teacher" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: params.teacherId },
      include: { user: true },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    if (teacher.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (teacher.user.isAcademyOwner) {
      return NextResponse.json(
        { error: "Cannot delete academy owner" },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: teacher.userId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete teacher:", error)
    return NextResponse.json(
      { error: "Failed to delete teacher" },
      { status: 500 }
    )
  }
}
