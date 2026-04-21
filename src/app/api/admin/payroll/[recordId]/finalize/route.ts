import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  notifyPayrollRecordFinalized,
} from "@/lib/notification-service"
import { ensureStoredPayrollSlipPdf } from "@/lib/pdf/document-service"
import {
  recalculateAutomaticPayrollAdjustments,
  synchronizePayrollRecordWithAdjustments,
} from "@/lib/payroll/payroll-adjustments"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  _req: NextRequest,
  { params }: { params: { recordId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const record = await prisma.payrollRecord.findFirst({
      where: {
        id: params.recordId,
        academyId: session.user.academyId,
      },
      select: {
        id: true,
        isFinalized: true,
      },
    })

    if (!record) {
      return NextResponse.json(
        { error: "Payroll record not found" },
        { status: 404 }
      )
    }

    await recalculateAutomaticPayrollAdjustments({
      recordId: record.id,
      actorUserId: session.user.id,
    })

    await synchronizePayrollRecordWithAdjustments({
      recordId: record.id,
      actorUserId: session.user.id,
    })

    if (!record.isFinalized) {
      await prisma.payrollRecord.update({
        where: {
          id: record.id,
        },
        data: {
          isFinalized: true,
          finalizedAt: new Date(),
          finalizedByUserId: session.user.id,
          salarySlipUrl: null,
          updatedByUserId: session.user.id,
        },
      })
    }

    const storedSlip = await ensureStoredPayrollSlipPdf(record.id)

    await notifyPayrollRecordFinalized(record.id)

    return NextResponse.json({
      success: true,
      salarySlipUrl: storedSlip?.fileUrl || null,
    })
  } catch (error) {
    console.error("Failed to finalize payroll record:", error)
    return NextResponse.json(
      { error: "Failed to finalize payroll record" },
      { status: 500 }
    )
  }
}
