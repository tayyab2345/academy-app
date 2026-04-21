import {
  PayrollAdjustmentSource,
  PayrollAdjustmentType,
  PayrollRuleMode,
  PayrollStatus,
  Role,
} from "@prisma/client"

export const PAYROLL_ELIGIBLE_ROLES = [Role.admin, Role.teacher] as const

export type PayrollEligibleRole = (typeof PAYROLL_ELIGIBLE_ROLES)[number]

export const payrollRoleLabels: Record<PayrollEligibleRole, string> = {
  admin: "Admin Staff",
  teacher: "Teacher",
}

export const payrollStatusLabels: Record<PayrollStatus, string> = {
  pending: "Pending",
  partial: "Partial",
  paid: "Paid",
}

export const payrollAdjustmentTypeLabels: Record<PayrollAdjustmentType, string> = {
  bonus: "Bonus",
  deduction: "Deduction",
  advance_adjustment: "Advance Adjustment",
}

export const payrollAdjustmentSourceLabels: Record<PayrollAdjustmentSource, string> = {
  late_join: "Late Join",
  absence: "Absence",
  overtime: "Overtime",
  manual: "Manual",
  advance: "Advance",
}

export const payrollRuleModeLabels: Record<PayrollRuleMode, string> = {
  fixed_amount: "Fixed Amount",
  percentage: "Percentage",
}

export function isPayrollEligibleRole(
  role: Role | string
): role is PayrollEligibleRole {
  return PAYROLL_ELIGIBLE_ROLES.includes(role as PayrollEligibleRole)
}

export function isPayrollStatus(
  status: PayrollStatus | string
): status is PayrollStatus {
  return Object.values(PayrollStatus).includes(status as PayrollStatus)
}

export function isPayrollRuleMode(
  value: PayrollRuleMode | string
): value is PayrollRuleMode {
  return Object.values(PayrollRuleMode).includes(value as PayrollRuleMode)
}

export function parsePayrollMonth(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return null
  }

  const [yearValue, monthValue] = value.split("-")
  const payYear = Number.parseInt(yearValue, 10)
  const payMonth = Number.parseInt(monthValue, 10)

  if (
    !Number.isFinite(payYear) ||
    !Number.isFinite(payMonth) ||
    payMonth < 1 ||
    payMonth > 12
  ) {
    return null
  }

  return {
    payYear,
    payMonth,
  }
}

export function getPayrollMonthValue(payYear: number, payMonth: number) {
  return `${payYear}-${String(payMonth).padStart(2, "0")}`
}

export function getPayrollPeriodBounds(payYear: number, payMonth: number) {
  const start = new Date(Date.UTC(payYear, payMonth - 1, 1))
  const end = new Date(Date.UTC(payYear, payMonth, 0, 23, 59, 59, 999))

  return { start, end }
}

export function formatPayrollPeriod(payYear: number, payMonth: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(payYear, payMonth - 1, 1)))
}

export function getRoleSortOrder(role: PayrollEligibleRole) {
  return role === Role.teacher ? 0 : 1
}

export function toNumber(value: unknown) {
  return Number(value)
}

export function roundPayrollAmount(value: number) {
  return Math.round(value * 100) / 100
}

export function calculatePayrollRuleAmount(input: {
  baseAmount: number
  mode: PayrollRuleMode
  value: number
}) {
  if (!Number.isFinite(input.baseAmount) || input.baseAmount < 0) {
    return 0
  }

  if (!Number.isFinite(input.value) || input.value <= 0) {
    return 0
  }

  if (input.mode === PayrollRuleMode.percentage) {
    return roundPayrollAmount((input.baseAmount * input.value) / 100)
  }

  return roundPayrollAmount(input.value)
}

export interface PayrollAdjustmentLike {
  type: PayrollAdjustmentType
  amount: number | string
}

export interface PayrollBreakdownTotals {
  baseSalary: number
  totalBonuses: number
  totalDeductions: number
  totalAdvanceAdjustments: number
  totalAdjustments: number
  netPayable: number
}

export function calculatePayrollBreakdownTotals(
  baseSalary: number,
  adjustments: PayrollAdjustmentLike[]
): PayrollBreakdownTotals {
  const normalizedBaseSalary = roundPayrollAmount(toNumber(baseSalary) || 0)

  let totalBonuses = 0
  let totalDeductions = 0
  let totalAdvanceAdjustments = 0

  for (const adjustment of adjustments) {
    const amount = Math.max(0, roundPayrollAmount(toNumber(adjustment.amount) || 0))

    if (adjustment.type === PayrollAdjustmentType.bonus) {
      totalBonuses += amount
    } else if (adjustment.type === PayrollAdjustmentType.advance_adjustment) {
      totalAdvanceAdjustments += amount
    } else {
      totalDeductions += amount
    }
  }

  totalBonuses = roundPayrollAmount(totalBonuses)
  totalDeductions = roundPayrollAmount(totalDeductions)
  totalAdvanceAdjustments = roundPayrollAmount(totalAdvanceAdjustments)

  const totalAdjustments = roundPayrollAmount(
    totalBonuses - totalDeductions - totalAdvanceAdjustments
  )
  const netPayable = roundPayrollAmount(
    Math.max(
      normalizedBaseSalary + totalBonuses - totalDeductions - totalAdvanceAdjustments,
      0
    )
  )

  return {
    baseSalary: normalizedBaseSalary,
    totalBonuses,
    totalDeductions,
    totalAdvanceAdjustments,
    totalAdjustments,
    netPayable,
  }
}

export interface NormalizedPayrollAmounts {
  grossAmount: number
  paidAmount: number
  status: PayrollStatus
  paymentDate: Date | null
}

export function normalizePayrollAmounts(input: {
  grossAmount: number
  payableAmount?: number | null
  paidAmount?: number | null
  status: PayrollStatus
  paymentDate?: Date | null
}): NormalizedPayrollAmounts {
  const grossAmount = roundPayrollAmount(Number(input.grossAmount))
  const payableAmount = roundPayrollAmount(
    Number(input.payableAmount ?? input.grossAmount)
  )

  if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
    throw new Error("Gross amount must be greater than zero")
  }

  if (!Number.isFinite(payableAmount) || payableAmount < 0) {
    throw new Error("Payable amount must be zero or greater")
  }

  const rawPaidAmount =
    input.paidAmount === null || input.paidAmount === undefined
      ? undefined
      : roundPayrollAmount(Number(input.paidAmount))

  if (
    rawPaidAmount !== undefined &&
    (!Number.isFinite(rawPaidAmount) || rawPaidAmount < 0)
  ) {
    throw new Error("Paid amount cannot be negative")
  }

  if (rawPaidAmount !== undefined && rawPaidAmount > payableAmount) {
    throw new Error("Paid amount cannot exceed the net payable salary")
  }

  if (input.status === PayrollStatus.pending) {
    return {
      grossAmount,
      paidAmount: 0,
      status: PayrollStatus.pending,
      paymentDate: null,
    }
  }

  if (input.status === PayrollStatus.partial) {
    const paidAmount = rawPaidAmount ?? 0

    if (paidAmount <= 0 || paidAmount >= payableAmount) {
      throw new Error(
        "Partial payroll must have a paid amount greater than zero and less than the net payable salary"
      )
    }

    return {
      grossAmount,
      paidAmount,
      status: PayrollStatus.partial,
      paymentDate: input.paymentDate || null,
    }
  }

  return {
    grossAmount,
    paidAmount: payableAmount,
    status: PayrollStatus.paid,
    paymentDate: input.paymentDate || new Date(),
  }
}
