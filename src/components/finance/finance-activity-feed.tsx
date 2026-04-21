"use client"

import Link from "next/link"
import {
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Send,
  Upload,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type FinanceActivityType =
  | "invoice"
  | "payment"
  | "submission"
  | "approval"
  | "rejection"
  | "sent"

interface FinanceActivityFeedProps {
  items: Array<{
    id: string
    type: FinanceActivityType
    title: string
    description: string
    occurredAt: string
    href?: string
    badge?: string
  }>
  emptyMessage?: string
  className?: string
}

const activityConfig: Record<
  FinanceActivityType,
  {
    icon: typeof FileText
    iconClassName: string
  }
> = {
  invoice: {
    icon: FileText,
    iconClassName: "text-blue-600 bg-blue-100 dark:bg-blue-950/40",
  },
  payment: {
    icon: DollarSign,
    iconClassName: "text-green-600 bg-green-100 dark:bg-green-950/40",
  },
  submission: {
    icon: Upload,
    iconClassName: "text-yellow-600 bg-yellow-100 dark:bg-yellow-950/40",
  },
  approval: {
    icon: CheckCircle2,
    iconClassName: "text-green-600 bg-green-100 dark:bg-green-950/40",
  },
  rejection: {
    icon: XCircle,
    iconClassName: "text-red-600 bg-red-100 dark:bg-red-950/40",
  },
  sent: {
    icon: Send,
    iconClassName: "text-purple-600 bg-purple-100 dark:bg-purple-950/40",
  },
}

export function FinanceActivityFeed({
  items,
  emptyMessage = "No finance activity yet.",
  className,
}: FinanceActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className={cn("py-8 text-center text-sm text-muted-foreground", className)}>
        <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const config = activityConfig[item.type]
        const content = (
          <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
            <div className={cn("rounded-full p-2", config.iconClassName)}>
              <config.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{item.title}</p>
                {item.badge && <Badge variant="outline">{item.badge}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(item.occurredAt).toLocaleString()}
              </p>
            </div>
          </div>
        )

        if (item.href) {
          return (
            <Link key={item.id} href={item.href} className="block">
              {content}
            </Link>
          )
        }

        return <div key={item.id}>{content}</div>
      })}
    </div>
  )
}
