import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isValidCurrency } from "@/lib/currency-utils"

const updateFeePlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  amount: z.number().positive().optional(),
  currency: z.string().refine(isValidCurrency, "Invalid currency").optional(),
  frequency: z.enum(["one_time", "monthly", "term", "yearly"]).optional(),
  dueDayOfMonth: z.number().min(1).max(31).optional().nullable(),
  lateFeeAmount: z.number().min(0).optional().nullable(),
  lateFeeType: z.enum(["fixed", "percentage"]).optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { feePlanId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const feePlan = await prisma.feePlan.findUnique({
      where: { id: params.feePlanId },
      include: {
        _count: {
          select: {
            classAssignments: true,
            invoices: true,
          },
        },
      },
    })

    if (!feePlan || feePlan.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Fee plan not found" }, { status: 404 })
    }

    return NextResponse.json({ feePlan })
  } catch (error) {
    console.error("Failed to fetch fee plan:", error)
    return NextResponse.json(
      { error: "Failed to fetch fee plan" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { feePlanId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = updateFeePlanSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const existingFeePlan = await prisma.feePlan.findUnique({
      where: { id: params.feePlanId },
    })

    if (!existingFeePlan || existingFeePlan.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Fee plan not found" }, { status: 404 })
    }

    const feePlan = await prisma.feePlan.update({
      where: { id: params.feePlanId },
      data: {
        name: validated.data.name,
        description:
          validated.data.description === undefined
            ? undefined
            : validated.data.description,
        amount: validated.data.amount,
        currency: validated.data.currency,
        frequency: validated.data.frequency,
        dueDayOfMonth:
          validated.data.dueDayOfMonth === undefined
            ? undefined
            : validated.data.dueDayOfMonth,
        lateFeeAmount:
          validated.data.lateFeeAmount === undefined
            ? undefined
            : validated.data.lateFeeAmount,
        lateFeeType:
          validated.data.lateFeeType === undefined
            ? undefined
            : validated.data.lateFeeType,
        isActive: validated.data.isActive,
      },
      include: {
        _count: {
          select: {
            classAssignments: true,
            invoices: true,
          },
        },
      },
    })

    return NextResponse.json({ feePlan })
  } catch (error) {
    console.error("Failed to update fee plan:", error)
    return NextResponse.json(
      { error: "Failed to update fee plan" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { feePlanId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const feePlan = await prisma.feePlan.findUnique({
      where: { id: params.feePlanId },
    })

    if (!feePlan || feePlan.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Fee plan not found" }, { status: 404 })
    }

    await prisma.feePlan.delete({
      where: { id: params.feePlanId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete fee plan:", error)
    return NextResponse.json(
      { error: "Failed to delete fee plan" },
      { status: 500 }
    )
  }
}
