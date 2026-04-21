import {
  PayrollAdjustmentSource,
  PayrollAdjustmentType,
} from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { synchronizePayrollRecordWithAdjustments } from "@/lib/payroll/payroll-adjustments"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const payrollAdjustmentSchema = z.object({
  type: z.nativeEnum(PayrollAdjustmentType),
  source: z.nativeEnum(PayrollAdjustmentSource),
  reason: z.string().trim().min(1, "Reason is required").max(500),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
})

async function getAdjustmentForAdmin(input: {
  academyId: string
  recordId: string
  adjustmentId: string
}) {
  return prisma.payrollAdjustment.findFirst({
    where: {
      id: input.adjustmentId,
      payrollRecordId: input.recordId,
      payrollRecord: {
        academyId: input.academyId,
      },
    },
    select: {
      id: true,
      payrollRecordId: true,
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { recordId: string; adjustmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = payrollAdjustmentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const adjustment = await getAdjustmentForAdmin({
      academyId: session.user.academyId,
      recordId: params.recordId,
      adjustmentId: params.adjustmentId,
    })

    if (!adjustment) {
      return NextResponse.json(
        { error: "Payroll adjustment not found" },
        { status: 404 }
      )
    }

    const updatedAdjustment = await prisma.$transaction(async (tx) => {
      const updated = await tx.payrollAdjustment.update({
        where: {
          id: adjustment.id,
        },
        data: {
          type: validated.data.type,
          source: validated.data.source,
          reason: validated.data.reason.trim(),
          amount: validated.data.amount,
          updatedByUserId: session.user.id,
        },
        select: {
          id: true,
          type: true,
          source: true,
          reason: true,
          amount: true,
        },
      })

      await tx.payrollRecord.update({
        where: { id: adjustment.payrollRecordId },
        data: {
          salarySlipUrl: null,
          updatedByUserId: session.user.id,
        },
      })

      return updated
    })

    await synchronizePayrollRecordWithAdjustments({
      recordId: adjustment.payrollRecordId,
      actorUserId: session.user.id,
    })

    return NextResponse.json({
      adjustment: {
        ...updatedAdjustment,
        amount: Number(updatedAdjustment.amount),
      },
    })
  } catch (error) {
    console.error("Failed to update payroll adjustment:", error)
    return NextResponse.json(
      { error: "Failed to update payroll adjustment" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { recordId: string; adjustmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adjustment = await getAdjustmentForAdmin({
      academyId: session.user.academyId,
      recordId: params.recordId,
      adjustmentId: params.adjustmentId,
    })

    if (!adjustment) {
      return NextResponse.json(
        { error: "Payroll adjustment not found" },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.payrollAdjustment.delete({
        where: { id: adjustment.id },
      })

      await tx.payrollRecord.update({
        where: { id: adjustment.payrollRecordId },
        data: {
          salarySlipUrl: null,
          updatedByUserId: session.user.id,
        },
      })
    })

    await synchronizePayrollRecordWithAdjustments({
      recordId: adjustment.payrollRecordId,
      actorUserId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete payroll adjustment:", error)
    return NextResponse.json(
      { error: "Failed to delete payroll adjustment" },
      { status: 500 }
    )
  }
}
