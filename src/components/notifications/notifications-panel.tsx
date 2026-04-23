"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
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

function emitNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications-updated"))
  }
}

interface NotificationsPanelProps {
  initialUnreadCount: number
}

export function NotificationsPanel({
  initialUnreadCount,
}: NotificationsPanelProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [isLoading, setIsLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    setUnreadCount(initialUnreadCount)
  }, [initialUnreadCount])

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications?unread=true&limit=1")
      const data = await response.json()
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error("Failed to fetch unread count:", error)
    }
  }

  const fetchNotifications = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/notifications?limit=5")
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const syncUnreadBadge = () => {
      if (document.visibilityState !== "visible") {
        return
      }

      void fetchUnreadCount()
    }

    if (!open) {
      syncUnreadBadge()
    }

    const intervalId = open ? null : window.setInterval(syncUnreadBadge, 60000)

    window.addEventListener("focus", syncUnreadBadge)
    window.addEventListener("notifications-updated", syncUnreadBadge)
    document.addEventListener("visibilitychange", syncUnreadBadge)

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId)
      }
      window.removeEventListener("focus", syncUnreadBadge)
      window.removeEventListener("notifications-updated", syncUnreadBadge)
      document.removeEventListener("visibilitychange", syncUnreadBadge)
    }
  }, [open])

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return
    }

    const syncOpenPanel = () => {
      if (document.visibilityState !== "visible") {
        return
      }

      void fetchNotifications()
    }

    syncOpenPanel()

    const intervalId = window.setInterval(syncOpenPanel, 60000)
    window.addEventListener("focus", syncOpenPanel)
    window.addEventListener("notifications-updated", syncOpenPanel)
    document.addEventListener("visibilitychange", syncOpenPanel)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", syncOpenPanel)
      window.removeEventListener("notifications-updated", syncOpenPanel)
      document.removeEventListener("visibilitychange", syncOpenPanel)
    }
  }, [open])

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to mark notification as read")
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        )
      )
      setUnreadCount((current) => Math.max(0, current - 1))
      emitNotificationsUpdated()
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

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      )
      setUnreadCount(0)
      emitNotificationsUpdated()
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 overflow-hidden border border-border bg-popover p-0 text-popover-foreground shadow-xl shadow-black/10"
        align="end"
      >
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-3 w-3" />
              )}
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-4">
          <Button asChild variant="outline" className="w-full">
            <Link href="/notifications">View All Notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
