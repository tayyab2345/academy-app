"use client"

import { PaymentStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"

interface PaymentStatusBadgeProps {
  status: PaymentStatus
  className?: string
}

const statusConfig: Record<
  PaymentStatus,
  {
    label: string
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning"
  }
> = {
  pending: { label: "Pending", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "outline" },
}

export function PaymentStatusBadge({
  status,
  className,
}: PaymentStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    variant: "secondary" as const,
  }

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
