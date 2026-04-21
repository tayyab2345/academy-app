"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NotificationItem } from "./notification-item"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  actionUrl: string | null
  createdAt: string
}

interface NotificationsListProps {
  notifications: Notification[]
  total: number
  page: number
  totalPages: number
  limit: number
  onPageChange: (page: number) => void
  onNotificationRead: () => void
  isLoading?: boolean
}

function emitNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications-updated"))
  }
}

export function NotificationsList({
  notifications,
  total,
  page,
  totalPages,
  limit,
  onPageChange,
  onNotificationRead,
  isLoading = false,
}: NotificationsListProps) {
  const router = useRouter()
  const [markingAll, setMarkingAll] = useState(false)

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to mark notification as read")
      }

      emitNotificationsUpdated()
      onNotificationRead()
      router.refresh()
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true)

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read")
      }

      emitNotificationsUpdated()
      onNotificationRead()
      router.refresh()
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="py-12 text-center">
        <Bell className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">No notifications yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
        </p>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
