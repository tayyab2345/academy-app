import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  formatRecoveryDeadline,
  isAcademyWithinRecoveryWindow,
} from "@/lib/academy-deletion"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const academy = await prisma.academy.findUnique({
      where: { id: session.user.academyId },
      select: {
        id: true,
        name: true,
        isDeleted: true,
        deletedAt: true,
      },
    })

    if (!academy) {
      return NextResponse.json({ error: "Academy not found" }, { status: 404 })
    }

    if (!academy.isDeleted) {
      return NextResponse.json(
        { error: "Academy is already active." },
        { status: 400 }
      )
    }

    if (!isAcademyWithinRecoveryWindow(academy.deletedAt)) {
      return NextResponse.json(
        {
          error: "The recovery window has expired for this academy.",
          recoveryDeadline: formatRecoveryDeadline(academy.deletedAt),
        },
        { status: 410 }
      )
    }

    const restoredAcademy = await prisma.academy.update({
      where: { id: academy.id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
      },
      select: {
        id: true,
        name: true,
        isDeleted: true,
        deletedAt: true,
        subdomain: true,
        contactEmail: true,
        primaryColor: true,
        logoUrl: true,
      },
    })

    return NextResponse.json({
      success: true,
      academy: {
        ...restoredAcademy,
        deletedAt: restoredAcademy.deletedAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error("Academy restore error:", error)
    return NextResponse.json(
      { error: "Failed to restore academy" },
      { status: 500 }
    )
  }
}
