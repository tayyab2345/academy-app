import { PayrollRuleMode } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { getOrCreateAcademyPayrollSettings } from "@/lib/payroll/payroll-adjustments"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const payrollRulesSchema = z.object({
  autoApplyLateDeductions: z.boolean(),
  lateGraceMinutes: z.coerce.number().int().min(0).max(240),
  lateDeductionMode: z.nativeEnum(PayrollRuleMode),
  lateDeductionValue: z.coerce.number().min(0),
  autoApplyAbsenceDeductions: z.boolean(),
  absenceDeductionMode: z.nativeEnum(PayrollRuleMode),
  absenceDeductionValue: z.coerce.number().min(0),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await getOrCreateAcademyPayrollSettings(
      session.user.academyId
    )

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Failed to fetch payroll rule settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch payroll rule settings" },
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
    const validated = payrollRulesSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const settings = await prisma.academyPayrollSettings.upsert({
      where: { academyId: session.user.academyId },
      update: {
        autoApplyLateDeductions: validated.data.autoApplyLateDeductions,
        lateGraceMinutes: validated.data.lateGraceMinutes,
        lateDeductionMode: validated.data.lateDeductionMode,
        lateDeductionValue: validated.data.lateDeductionValue,
        autoApplyAbsenceDeductions: validated.data.autoApplyAbsenceDeductions,
        absenceDeductionMode: validated.data.absenceDeductionMode,
        absenceDeductionValue: validated.data.absenceDeductionValue,
      },
      create: {
        academyId: session.user.academyId,
        autoApplyLateDeductions: validated.data.autoApplyLateDeductions,
        lateGraceMinutes: validated.data.lateGraceMinutes,
        lateDeductionMode: validated.data.lateDeductionMode,
        lateDeductionValue: validated.data.lateDeductionValue,
        autoApplyAbsenceDeductions: validated.data.autoApplyAbsenceDeductions,
        absenceDeductionMode: validated.data.absenceDeductionMode,
        absenceDeductionValue: validated.data.absenceDeductionValue,
      },
      select: {
        id: true,
        academyId: true,
        autoApplyLateDeductions: true,
        lateGraceMinutes: true,
        lateDeductionMode: true,
        lateDeductionValue: true,
        autoApplyAbsenceDeductions: true,
        absenceDeductionMode: true,
        absenceDeductionValue: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      settings: {
        ...settings,
        lateDeductionValue: Number(settings.lateDeductionValue),
        absenceDeductionValue: Number(settings.absenceDeductionValue),
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Failed to save payroll rule settings:", error)
    return NextResponse.json(
      { error: "Failed to save payroll rule settings" },
      { status: 500 }
    )
  }
}
