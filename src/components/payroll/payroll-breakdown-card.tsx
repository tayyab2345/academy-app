"use client"

import { CurrencyAmount } from "@/components/ui/currency-amount"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PayrollBreakdownSummary } from "@/lib/payroll/payroll-data"

interface PayrollBreakdownCardProps {
  breakdown: PayrollBreakdownSummary
  paidAmount: number
  outstandingAmount: number
  currency: string
}

function BreakdownRow({
  label,
  amount,
  currency,
  emphasize = false,
  negative = false,
}: {
  label: string
  amount: number
  currency: string
  emphasize?: boolean
  negative?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={emphasize ? "font-medium text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={
          emphasize
            ? "font-semibold text-foreground"
            : negative
              ? "font-medium text-red-600"
              : "font-medium"
        }
      >
        {negative ? "-" : ""}
        <CurrencyAmount amount={Math.abs(amount)} currency={currency} />
      </span>
    </div>
  )
}

export function PayrollBreakdownCard({
  breakdown,
  paidAmount,
  outstandingAmount,
  currency,
}: PayrollBreakdownCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Breakdown</CardTitle>
        <CardDescription>
          Base salary, payroll adjustments, and the current net payable amount.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <BreakdownRow
          label="Basic salary"
          amount={breakdown.baseSalary}
          currency={currency}
        />
        <BreakdownRow
          label="Bonuses"
          amount={breakdown.totalBonuses}
          currency={currency}
        />
        <BreakdownRow
          label="Deductions"
          amount={breakdown.totalDeductions}
          currency={currency}
          negative
        />
        <BreakdownRow
          label="Advance adjustments"
          amount={breakdown.totalAdvanceAdjustments}
          currency={currency}
          negative
        />
        <div className="border-t pt-3">
          <BreakdownRow
            label="Net payable"
            amount={breakdown.netPayable}
            currency={currency}
            emphasize
          />
        </div>
        <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Paid Amount
            </p>
            <p className="mt-1 text-lg font-semibold text-green-600">
              <CurrencyAmount amount={paidAmount} currency={currency} />
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Outstanding
            </p>
            <p className="mt-1 text-lg font-semibold text-yellow-600">
              <CurrencyAmount amount={outstandingAmount} currency={currency} />
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
