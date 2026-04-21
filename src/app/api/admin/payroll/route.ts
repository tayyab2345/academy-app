import { NextRequest, NextResponse } from "next/server"
import { PayrollStatus, Role } from "@prisma/client"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import {
  getAdminPayrollList,
  getPayrollStaffOptions,
  parsePayrollStatusFilter,
} from "@/lib/payroll/payroll-data"
import {
  normalizePayrollAmounts,
  parsePayrollMonth,
} from "@/lib/payroll/payroll-utils"
import {
  getPayrollRecordPayableAmount,
  recalculateAutomaticPayrollAdjustments,
} from "@/lib/payroll/payroll-adjustments"
import {
  notifyPayrollPaid,
  notifyPayrollRecordCreated,
} from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const createPayrollRecordSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  grossAmount: z.coerce.number().positive(),
  currency: z.string().trim().min(3).max(8),
  status: z.nativeEnum(PayrollStatus),
  paidAmount: z.coerce.number().min(0).optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max: number = 100
) {
  const parsed = Number.parseInt(value || "", 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.min(parsed, max)
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = parsePositiveInt(searchParams.get("page") || undefined, 1)
    const limit = parsePositiveInt(searchParams.get("limit") || undefined, 10)
    const role = searchParams.get("role") || undefined
    const userId = searchParams.get("userId") || undefined
    const month = searchParams.get("month") || undefined
    const status = parsePayrollStatusFilter(
      searchParams.get("status") || undefined
    )

    const [data, staffOptions] = await Promise.all([
      getAdminPayrollList({
        academyId: session.user.academyId,
        page,
        limit,
        role: role === "teacher" || role === "admin" ? role : undefined,
        userId,
        month,
        status,
      }),
      getPayrollStaffOptions(
        session.user.academyId,
        userId ? [userId] : []
      ),
    ])

    return NextResponse.json({
      ...data,
      staffOptions,
    })
  } catch (error) {
    console.error("Failed to fetch payroll records:", error)
    return NextResponse.json(
      { error: "Failed to fetch payroll records" },
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
    const validated = createPayrollRecordSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const payrollMonth = parsePayrollMonth(validated.data.month)

    if (!payrollMonth) {
      return NextResponse.json(
        { error: "Invalid payroll month" },
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
        isActive: true,
      },
      select: {
        id: true,
        role: true,
        compensationProfile: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      )
    }

    if (!user.compensationProfile || !user.compensationProfile.isActive) {
      return NextResponse.json(
        { error: "The selected employee does not have an active salary profile" },
        { status: 400 }
      )
    }

    const existingRecord = await prisma.payrollRecord.findFirst({
      where: {
        academyId: session.user.academyId,
        userId: user.id,
        payYear: payrollMonth.payYear,
        payMonth: payrollMonth.payMonth,
      },
      select: {
        id: true,
      },
    })

    if (existingRecord) {
      return NextResponse.json(
        {
          error: "A payroll record already exists for this employee and month",
          recordId: existingRecord.id,
        },
        { status: 400 }
      )
    }

    const record = await prisma.payrollRecord.create({
      data: {
        academyId: session.user.academyId,
        staffCompensationProfileId: user.compensationProfile.id,
        userId: user.id,
        role: user.role,
        payYear: payrollMonth.payYear,
        payMonth: payrollMonth.payMonth,
        grossAmount: validated.data.grossAmount,
        paidAmount: 0,
        currency: validated.data.currency.trim().toUpperCase(),
        status: PayrollStatus.pending,
        paymentDate: null,
        notes: validated.data.notes?.trim() || null,
        createdByUserId: session.user.id,
      },
      select: {
        id: true,
        payYear: true,
        payMonth: true,
        status: true,
      },
    })

    await recalculateAutomaticPayrollAdjustments({
      recordId: record.id,
      actorUserId: session.user.id,
    })

    const payableAmount = await getPayrollRecordPayableAmount({
      recordId: record.id,
      grossAmountOverride: validated.data.grossAmount,
    })

    const normalized = normalizePayrollAmounts({
      grossAmount: validated.data.grossAmount,
      payableAmount: payableAmount ?? validated.data.grossAmount,
      paidAmount: validated.data.paidAmount,
      status: validated.data.status,
      paymentDate: parseOptionalDate(validated.data.paymentDate),
    })

    await prisma.payrollRecord.update({
      where: { id: record.id },
      data: {
        grossAmount: normalized.grossAmount,
        paidAmount: normalized.paidAmount,
        status: normalized.status,
        paymentDate: normalized.paymentDate,
        updatedByUserId: session.user.id,
      },
    })

    await notifyPayrollRecordCreated(record.id)

    if (normalized.status === PayrollStatus.paid) {
      await notifyPayrollPaid(record.id)
    }

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error("Failed to create payroll record:", error)
    return NextResponse.json(
      { error: "Failed to create payroll record" },
      { status: 500 }
    )
  }
}
