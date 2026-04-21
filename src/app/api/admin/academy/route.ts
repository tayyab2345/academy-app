import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ACADEMY_DELETE_CONFIRMATION_TEXT,
  formatRecoveryDeadline,
} from "@/lib/academy-deletion"

const deleteAcademySchema = z.object({
  confirmationText: z.string().trim(),
})

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const validated = deleteAcademySchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.errors },
        { status: 400 }
      )
    }

    if (validated.data.confirmationText !== ACADEMY_DELETE_CONFIRMATION_TEXT) {
      return NextResponse.json(
        { error: "Confirmation text did not match." },
        { status: 400 }
      )
    }

    const academy = await prisma.academy.findUnique({
      where: { id: session.user.academyId },
      select: {
        id: true,
        isDeleted: true,
        deletedAt: true,
      },
    })

    if (!academy) {
      return NextResponse.json({ error: "Academy not found" }, { status: 404 })
    }

    if (academy.isDeleted) {
      return NextResponse.json(
        {
          error: "Academy is already deactivated.",
          deletedAt: academy.deletedAt?.toISOString() ?? null,
          recoveryDeadline: formatRecoveryDeadline(academy.deletedAt),
        },
        { status: 409 }
      )
    }

    const deletedAt = new Date()

    const updatedAcademy = await prisma.academy.update({
      where: { id: academy.id },
      data: {
        isDeleted: true,
        deletedAt,
        deletedByUserId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        isDeleted: true,
        deletedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      academy: {
        ...updatedAcademy,
        deletedAt: updatedAcademy.deletedAt?.toISOString() ?? null,
      },
      recoveryDeadline: formatRecoveryDeadline(updatedAcademy.deletedAt),
    })
  } catch (error) {
    console.error("Academy deactivation error:", error)
    return NextResponse.json(
      { error: "Failed to deactivate academy" },
      { status: 500 }
    )
  }
}
