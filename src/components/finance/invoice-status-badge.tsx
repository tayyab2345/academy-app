"use client"

import { InvoiceStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

const statusConfig: Record<
  InvoiceStatus,
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
  draft: { label: "Draft", variant: "secondary" },
  sent: { label: "Sent", variant: "default" },
  partial: { label: "Partial", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  overdue: { label: "Overdue", variant: "destructive" },
  waived: { label: "Waived", variant: "outline" },
}

export function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps) {
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
