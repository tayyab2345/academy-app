import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateStudentSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  phone: z.string().optional().nullable(),
  studentId: z.string().min(1).optional(),
  dateOfBirth: z.string().or(z.date()).optional(),
  gradeLevel: z.string().min(1).optional(),
  enrollmentDate: z.string().or(z.date()).optional(),
  medicalNotes: z.string().optional().nullable(),
  emergencyContactName: z.string().min(1).optional(),
  emergencyContactPhone: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: params.studentId },
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
            createdAt: true,
            updatedAt: true,
          },
        },
        parentLinks: {
          include: {
            parentProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    if (student.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error("Failed to fetch student:", error)
    return NextResponse.json(
      { error: "Failed to fetch student" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = updateStudentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const { password, studentId, ...updateData } = validated.data

    const existingStudent = await prisma.studentProfile.findUnique({
      where: { id: params.studentId },
      include: { user: true },
    })

    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    if (existingStudent.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (studentId && studentId !== existingStudent.studentId) {
      const duplicateStudent = await prisma.studentProfile.findFirst({
        where: {
          studentId,
          id: { not: params.studentId },
        },
      })

      if (duplicateStudent) {
        return NextResponse.json(
          { error: "Student ID already exists" },
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

    const updatedStudent = await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: existingStudent.userId },
          data: userUpdateData,
        })
      }

      const profileData: Prisma.StudentProfileUpdateInput = {}
      if (studentId) profileData.studentId = studentId
      if (updateData.dateOfBirth) {
        profileData.dateOfBirth = new Date(updateData.dateOfBirth)
      }
      if (updateData.gradeLevel) profileData.gradeLevel = updateData.gradeLevel
      if (updateData.enrollmentDate) {
        profileData.enrollmentDate = new Date(updateData.enrollmentDate)
      }
      if (updateData.medicalNotes !== undefined) {
        profileData.medicalNotes = updateData.medicalNotes
      }
      if (updateData.emergencyContactName) {
        profileData.emergencyContactName = updateData.emergencyContactName
      }
      if (updateData.emergencyContactPhone) {
        profileData.emergencyContactPhone = updateData.emergencyContactPhone
      }

      const profile = await tx.studentProfile.update({
        where: { id: params.studentId },
        data: profileData,
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

    return NextResponse.json({ student: updatedStudent })
  } catch (error) {
    console.error("Failed to update student:", error)
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: params.studentId },
      include: { user: true },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    if (student.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: student.userId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete student:", error)
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 }
    )
  }
}
