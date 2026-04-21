"use client"

import {
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Send,
  Upload,
  XCircle,
} from "lucide-react"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { cn } from "@/lib/utils"

export interface InvoiceTimelineEvent {
  id: string
  type: "created" | "sent" | "submitted" | "approved" | "rejected" | "paid" | "partial"
  date: string
  actor?: {
    name: string
    role: string
  }
  amount?: number
  currency?: string
  note?: string
  rejectionReason?: string
}

interface InvoiceTimelineProps {
  events: InvoiceTimelineEvent[]
  className?: string
}

const eventConfig: Record<
  InvoiceTimelineEvent["type"],
  { icon: React.ReactNode; label: string; color: string }
> = {
  created: {
    icon: <FileText className="h-4 w-4" />,
    label: "Invoice Created",
    color: "text-blue-600 bg-blue-100 dark:bg-blue-950/40",
  },
  sent: {
    icon: <Send className="h-4 w-4" />,
    label: "Invoice Sent",
    color: "text-purple-600 bg-purple-100 dark:bg-purple-950/40",
  },
  submitted: {
    icon: <Upload className="h-4 w-4" />,
    label: "Payment Proof Submitted",
    color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-950/40",
  },
  approved: {
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Payment Approved",
    color: "text-green-600 bg-green-100 dark:bg-green-950/40",
  },
  rejected: {
    icon: <XCircle className="h-4 w-4" />,
    label: "Payment Rejected",
    color: "text-red-600 bg-red-100 dark:bg-red-950/40",
  },
  paid: {
    icon: <DollarSign className="h-4 w-4" />,
    label: "Payment Received",
    color: "text-green-600 bg-green-100 dark:bg-green-950/40",
  },
  partial: {
    icon: <Clock className="h-4 w-4" />,
    label: "Partial Payment",
    color: "text-orange-600 bg-orange-100 dark:bg-orange-950/40",
  },
}

export function InvoiceTimeline({ events, className }: InvoiceTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        No timeline events available
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {events.map((event, index) => {
        const config = eventConfig[event.type]

        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn("rounded-full p-2", config.color)}>
                {config.icon}
              </div>
              {index < events.length - 1 && (
                <div className="mt-2 h-full w-px bg-border" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{config.label}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.date).toLocaleString()}
                </span>
              </div>

              {event.actor && (
                <p className="text-sm text-muted-foreground">
                  by {event.actor.name} ({event.actor.role})
                </p>
              )}

              {typeof event.amount === "number" && event.currency && (
                <p className="mt-1 text-sm font-medium">
                  Amount:{" "}
                  <CurrencyAmount amount={event.amount} currency={event.currency} />
                </p>
              )}

              {event.rejectionReason && (
                <div className="mt-2 rounded-md bg-destructive/10 p-2 text-sm">
                  <p className="font-medium text-destructive">
                    Rejection Reason:
                  </p>
                  <p>{event.rejectionReason}</p>
                </div>
              )}

              {event.note && (
                <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
