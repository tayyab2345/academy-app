import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  recalculateAutomaticPayrollAdjustments,
  synchronizePayrollRecordWithAdjustments,
} from "@/lib/payroll/payroll-adjustments"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

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
      },
    })

    if (!record) {
      return NextResponse.json(
        { error: "Payroll record not found" },
        { status: 404 }
      )
    }

    const result = await recalculateAutomaticPayrollAdjustments({
      recordId: record.id,
      actorUserId: session.user.id,
    })

    const syncedRecord = await synchronizePayrollRecordWithAdjustments({
      recordId: record.id,
      actorUserId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      adjustmentCount: result?.adjustments.length || 0,
      status: syncedRecord?.status || null,
      netPayable: syncedRecord?.netPayable || null,
    })
  } catch (error) {
    console.error("Failed to recalculate payroll adjustments:", error)
    return NextResponse.json(
      { error: "Failed to recalculate payroll adjustments" },
      { status: 500 }
    )
  }
}
