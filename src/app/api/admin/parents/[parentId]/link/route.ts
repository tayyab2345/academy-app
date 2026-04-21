import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const linkStudentSchema = z.object({
  studentId: z.string().min(1),
  relationshipType: z.enum(["father", "mother", "guardian", "grandparent", "other"]),
  canPickup: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  isPrimaryForStudent: z.boolean().default(false),
})

const unlinkStudentSchema = z.object({
  studentId: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { parentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = linkStudentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const { studentId, ...linkData } = validated.data

    const parent = await prisma.parentProfile.findUnique({
      where: { id: params.parentId },
      include: { user: true },
    })

    if (!parent || parent.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 })
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true },
    })

    if (!student || student.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const existingLink = await prisma.parentStudentLink.findUnique({
      where: {
        parentProfileId_studentProfileId: {
          parentProfileId: params.parentId,
          studentProfileId: studentId,
        },
      },
    })

    if (existingLink) {
      return NextResponse.json(
        { error: "Parent is already linked to this student" },
        { status: 400 }
      )
    }

    const link = await prisma.$transaction(async (tx) => {
      if (linkData.isPrimaryForStudent) {
        await tx.parentStudentLink.updateMany({
          where: {
            studentProfileId: studentId,
            isPrimaryForStudent: true,
          },
          data: {
            isPrimaryForStudent: false,
          },
        })
      }

      return tx.parentStudentLink.create({
        data: {
          parentProfileId: params.parentId,
          studentProfileId: studentId,
          relationshipType: linkData.relationshipType,
          canPickup: linkData.canPickup,
          isEmergencyContact: linkData.isEmergencyContact,
          isPrimaryForStudent: linkData.isPrimaryForStudent,
        },
        include: {
          studentProfile: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      })
    })

    return NextResponse.json({ link }, { status: 201 })
  } catch (error) {
    console.error("Failed to link student:", error)
    return NextResponse.json(
      { error: "Failed to link student" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { parentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = unlinkStudentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      )
    }

    const { studentId } = validated.data

    const parent = await prisma.parentProfile.findUnique({
      where: { id: params.parentId },
      include: { user: true },
    })

    if (!parent || parent.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 })
    }

    await prisma.parentStudentLink.delete({
      where: {
        parentProfileId_studentProfileId: {
          parentProfileId: params.parentId,
          studentProfileId: studentId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to unlink student:", error)
    return NextResponse.json(
      { error: "Failed to unlink student" },
      { status: 500 }
    )
  }
}
