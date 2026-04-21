import { NextRequest, NextResponse } from "next/server"
import { PayrollStatus } from "@prisma/client"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { getAdminPayrollRecordDetail } from "@/lib/payroll/payroll-data"
import { normalizePayrollAmounts } from "@/lib/payroll/payroll-utils"
import {
  getPayrollRecordPayableAmount,
  recalculateAutomaticPayrollAdjustments,
} from "@/lib/payroll/payroll-adjustments"
import { notifyPayrollPaid } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const updatePayrollRecordSchema = z.object({
  grossAmount: z.coerce.number().positive(),
  status: z.nativeEnum(PayrollStatus),
  paidAmount: z.coerce.number().min(0).optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

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

export async function GET(
  _req: NextRequest,
  { params }: { params: { recordId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await getAdminPayrollRecordDetail(
      session.user.academyId,
      params.recordId
    )

    if (!data) {
      return NextResponse.json(
        { error: "Payroll record not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to fetch payroll record:", error)
    return NextResponse.json(
      { error: "Failed to fetch payroll record" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { recordId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = updatePayrollRecordSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const existingRecord = await prisma.payrollRecord.findFirst({
      where: {
        id: params.recordId,
        academyId: session.user.academyId,
      },
      select: {
        id: true,
        status: true,
      },
    })

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Payroll record not found" },
        { status: 404 }
      )
    }

    await prisma.payrollRecord.update({
      where: {
        id: existingRecord.id,
      },
      data: {
        grossAmount: validated.data.grossAmount,
        notes: validated.data.notes?.trim() || null,
        salarySlipUrl: null,
        updatedByUserId: session.user.id,
      },
    })

    await recalculateAutomaticPayrollAdjustments({
      recordId: existingRecord.id,
      actorUserId: session.user.id,
    })

    const payableAmount = await getPayrollRecordPayableAmount({
      recordId: existingRecord.id,
      grossAmountOverride: validated.data.grossAmount,
    })

    const normalized = normalizePayrollAmounts({
      grossAmount: validated.data.grossAmount,
      payableAmount: payableAmount ?? validated.data.grossAmount,
      paidAmount: validated.data.paidAmount,
      status: validated.data.status,
      paymentDate: parseOptionalDate(validated.data.paymentDate),
    })

    const record = await prisma.payrollRecord.update({
      where: {
        id: existingRecord.id,
      },
      data: {
        grossAmount: normalized.grossAmount,
        paidAmount: normalized.paidAmount,
        status: normalized.status,
        paymentDate: normalized.paymentDate,
        notes: validated.data.notes?.trim() || null,
        salarySlipUrl: null,
        updatedByUserId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        paidAmount: true,
        paymentDate: true,
      },
    })

    if (
      existingRecord.status !== PayrollStatus.paid &&
      normalized.status === PayrollStatus.paid
    ) {
      await notifyPayrollPaid(record.id)
    }

    return NextResponse.json({ record })
  } catch (error) {
    console.error("Failed to update payroll record:", error)
    return NextResponse.json(
      { error: "Failed to update payroll record" },
      { status: 500 }
    )
  }
}
