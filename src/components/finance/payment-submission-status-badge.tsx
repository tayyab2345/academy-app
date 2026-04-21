import { ReactNode } from "react"
import { SubmissionStatus } from "@prisma/client"
import { CheckCircle, Clock, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PaymentSubmissionStatusBadgeProps {
  status: SubmissionStatus
  className?: string
}

const statusConfig: Record<
  SubmissionStatus,
  {
    label: string
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning"
    icon: ReactNode
  }
> = {
  pending: {
    label: "Pending Review",
    variant: "warning",
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: "Approved",
    variant: "success",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
}

export function PaymentSubmissionStatusBadge({
  status,
  className,
}: PaymentSubmissionStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={className}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  )
}
