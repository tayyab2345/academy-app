"use client"

import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Bell,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Megaphone,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationItemProps {
  notification: {
    id: string
    type: string
    title: string
    message: string
    isRead: boolean
    actionUrl: string | null
    createdAt: string
  }
  onMarkAsRead?: (id: string) => void | Promise<void>
}

const typeConfig: Record<
  string,
  {
    icon: React.ReactNode
    color: string
  }
> = {
  attendance: {
    icon: <Calendar className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-950",
  },
  fee_due: {
    icon: <DollarSign className="h-4 w-4" />,
    color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-950",
  },
  report_published: {
    icon: <FileText className="h-4 w-4" />,
    color: "text-green-600 bg-green-100 dark:bg-green-950",
  },
  class_cancelled: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-red-600 bg-red-100 dark:bg-red-950",
  },
  comment_reply: {
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-purple-600 bg-purple-100 dark:bg-purple-950",
  },
  announcement: {
    icon: <Megaphone className="h-4 w-4" />,
    color: "text-orange-600 bg-orange-100 dark:bg-orange-950",
  },
  payment_received: {
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-green-600 bg-green-100 dark:bg-green-950",
  },
  invoice_sent: {
    icon: <FileText className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-950",
  },
  payment_overdue: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-red-600 bg-red-100 dark:bg-red-950",
  },
}

function formatTimeAgo(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return then.toLocaleDateString()
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const router = useRouter()
  const config = typeConfig[notification.type] || {
    icon: <Bell className="h-4 w-4" />,
    color: "text-muted-foreground bg-muted",
  }

  const handleClick = async () => {
    if (!notification.isRead && onMarkAsRead) {
      await onMarkAsRead(notification.id)
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 transition-colors",
        (notification.actionUrl || !notification.isRead) && "cursor-pointer hover:bg-muted/50",
        !notification.isRead && "bg-muted/30"
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          void handleClick()
        }
      }}
    >
      <div className={cn("shrink-0 rounded-full p-2", config.color)}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("font-medium", !notification.isRead && "font-semibold")}>
            {notification.title}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatTimeAgo(notification.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          {notification.message}
        </p>
      </div>
      {!notification.isRead && (
        <div className="shrink-0">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
      )}
    </div>
  )
}
