import { NextRequest, NextResponse } from "next/server"
import { Role } from "@prisma/client"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import {
  getCompensationProfiles,
  getPayrollStaffOptions,
} from "@/lib/payroll/payroll-data"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const salaryProfileSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  amount: z.coerce.number().positive("Salary amount must be greater than zero"),
  currency: z.string().trim().min(3).max(8),
  effectiveFrom: z.string().min(1, "Effective date is required"),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const role = searchParams.get("role") || undefined
    const userId = searchParams.get("userId") || undefined

    const [profiles, staffOptions] = await Promise.all([
      getCompensationProfiles({
        academyId: session.user.academyId,
        role: role === "teacher" || role === "admin" ? role : undefined,
        userId,
      }),
      getPayrollStaffOptions(
        session.user.academyId,
        userId ? [userId] : []
      ),
    ])

    return NextResponse.json({
      profiles,
      staffOptions,
    })
  } catch (error) {
    console.error("Failed to fetch payroll settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch payroll settings" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = salaryProfileSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        id: validated.data.userId,
        academyId: session.user.academyId,
        role: {
          in: [Role.admin, Role.teacher],
        },
      },
      select: {
        id: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      )
    }

    const effectiveFrom = new Date(validated.data.effectiveFrom)

    if (Number.isNaN(effectiveFrom.getTime())) {
      return NextResponse.json(
        { error: "Invalid effective date" },
        { status: 400 }
      )
    }

    const profile = await prisma.staffCompensationProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        amount: validated.data.amount,
        currency: validated.data.currency.trim().toUpperCase(),
        effectiveFrom,
        notes: validated.data.notes?.trim() || null,
        isActive: validated.data.isActive,
        updatedByUserId: session.user.id,
      },
      create: {
        academyId: session.user.academyId,
        userId: user.id,
        amount: validated.data.amount,
        currency: validated.data.currency.trim().toUpperCase(),
        effectiveFrom,
        notes: validated.data.notes?.trim() || null,
        isActive: validated.data.isActive,
        createdByUserId: session.user.id,
      },
      select: {
        id: true,
        userId: true,
        amount: true,
        currency: true,
        isActive: true,
      },
    })

    return NextResponse.json({
      profile: {
        ...profile,
        amount: Number(profile.amount),
      },
    })
  } catch (error) {
    console.error("Failed to save salary profile:", error)
    return NextResponse.json(
      { error: "Failed to save salary profile" },
      { status: 500 }
    )
  }
}

