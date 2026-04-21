"use client"

import { PayrollStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { payrollStatusLabels } from "@/lib/payroll/payroll-utils"

interface PayrollStatusBadgeProps {
  status: PayrollStatus
}

const payrollStatusVariants: Record<
  PayrollStatus,
  "secondary" | "warning" | "success"
> = {
  pending: "secondary",
  partial: "warning",
  paid: "success",
}

export function PayrollStatusBadge({ status }: PayrollStatusBadgeProps) {
  return (
    <Badge variant={payrollStatusVariants[status]}>
      {payrollStatusLabels[status]}
    </Badge>
  )
}

