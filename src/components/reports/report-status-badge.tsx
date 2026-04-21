"use client"

import { ReportStatus } from "@prisma/client"
import { FileText, CheckCircle, Archive } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ReportStatusBadgeProps {
  status: ReportStatus
  className?: string
  showIcon?: boolean
}

const statusConfig: Record<
  ReportStatus,
  {
    label: string
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning"
    icon: React.ReactNode
  }
> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    icon: <FileText className="h-3 w-3" />,
  },
  published: {
    label: "Published",
    variant: "success",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  archived: {
    label: "Archived",
    variant: "outline",
    icon: <Archive className="h-3 w-3" />,
  },
}

export function ReportStatusBadge({
  status,
  className,
  showIcon = true,
}: ReportStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    variant: "secondary" as const,
    icon: <FileText className="h-3 w-3" />,
  }

  return (
    <Badge variant={config.variant} className={className}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  )
}
