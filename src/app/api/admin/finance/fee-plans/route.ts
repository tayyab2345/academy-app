import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isValidCurrency } from "@/lib/currency-utils"

const createFeePlanSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().refine(isValidCurrency, "Invalid currency"),
  frequency: z.enum(["one_time", "monthly", "term", "yearly"]),
  dueDayOfMonth: z.number().min(1).max(31).optional().nullable(),
  lateFeeAmount: z.number().min(0).optional().nullable(),
  lateFeeType: z.enum(["fixed", "percentage"]).optional().nullable(),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const isActive = searchParams.get("isActive")
    const frequency = searchParams.get("frequency")
    const currency = searchParams.get("currency")

    const where: any = {
      academyId: session.user.academyId,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (isActive !== null && isActive !== "") {
      where.isActive = isActive === "true"
    }

    if (frequency) {
      where.frequency = frequency
    }

    if (currency) {
      where.currency = currency
    }

    const [feePlans, total] = await Promise.all([
      prisma.feePlan.findMany({
        where,
        include: {
          _count: {
            select: {
              classAssignments: true,
              invoices: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.feePlan.count({ where }),
    ])

    return NextResponse.json({
      feePlans,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Failed to fetch fee plans:", error)
    return NextResponse.json(
      { error: "Failed to fetch fee plans" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = createFeePlanSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const feePlan = await prisma.feePlan.create({
      data: {
        academy: {
          connect: {
            id: session.user.academyId,
          },
        },
        name: validated.data.name,
        description: validated.data.description,
        amount: validated.data.amount,
        currency: validated.data.currency,
        frequency: validated.data.frequency,
        dueDayOfMonth: validated.data.dueDayOfMonth,
        lateFeeAmount: validated.data.lateFeeAmount,
        lateFeeType: validated.data.lateFeeType,
        isActive: validated.data.isActive,
      },
    })

    return NextResponse.json({ feePlan }, { status: 201 })
  } catch (error) {
    console.error("Failed to create fee plan:", error)
    return NextResponse.json(
      { error: "Failed to create fee plan" },
      { status: 500 }
    )
  }
}
