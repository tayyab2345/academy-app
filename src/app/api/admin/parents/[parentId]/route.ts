import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateParentSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  phone: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  preferredContactMethod: z.enum(["email", "phone", "sms"]).optional(),
  isPrimaryContact: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { parentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parent = await prisma.parentProfile.findUnique({
      where: { id: params.parentId },
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
        studentLinks: {
          include: {
            studentProfile: {
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
      },
    })

    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 })
    }

    if (parent.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ parent })
  } catch (error) {
    console.error("Failed to fetch parent:", error)
    return NextResponse.json(
      { error: "Failed to fetch parent" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { parentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = updateParentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const { password, ...updateData } = validated.data

    const existingParent = await prisma.parentProfile.findUnique({
      where: { id: params.parentId },
      include: { user: true },
    })

    if (!existingParent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 })
    }

    if (existingParent.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    const updatedParent = await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: existingParent.userId },
          data: userUpdateData,
        })
      }

      const profile = await tx.parentProfile.update({
        where: { id: params.parentId },
        data: {
          occupation: updateData.occupation,
          preferredContactMethod: updateData.preferredContactMethod,
          isPrimaryContact: updateData.isPrimaryContact,
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

    return NextResponse.json({ parent: updatedParent })
  } catch (error) {
    console.error("Failed to update parent:", error)
    return NextResponse.json(
      { error: "Failed to update parent" },
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

    const parent = await prisma.parentProfile.findUnique({
      where: { id: params.parentId },
      include: { user: true },
    })

    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 })
    }

    if (parent.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: parent.userId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete parent:", error)
    return NextResponse.json(
      { error: "Failed to delete parent" },
      { status: 500 }
    )
  }
}
