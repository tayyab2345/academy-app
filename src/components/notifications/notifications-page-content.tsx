"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import type { NotificationPageItem } from "@/lib/notifications/notification-data"
import { NotificationsList } from "@/components/notifications/notifications-list"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "attendance", label: "Attendance" },
  { value: "fee_due", label: "Fee Due" },
  { value: "report_published", label: "Reports" },
  { value: "announcement", label: "Announcements" },
  { value: "comment_reply", label: "Comment Replies" },
  { value: "payment_received", label: "Payments" },
]

interface NotificationsPageContentProps {
  notifications: NotificationPageItem[]
  total: number
  unreadCount: number
  page: number
  limit: number
  appliedTypeFilter: string
  showUnreadOnly: boolean
}

export function NotificationsPageContent({
  notifications,
  total,
  unreadCount,
  page,
  limit,
  appliedTypeFilter,
  showUnreadOnly,
}: NotificationsPageContentProps) {
  const router = useRouter()
  const [viewState, setViewState] = useState(() => ({
    items: notifications,
    unreadCount,
  }))
  const typeFilter = appliedTypeFilter || "all"

  useEffect(() => {
    setViewState({
      items: notifications,
      unreadCount,
    })
  }, [notifications, unreadCount])

  const buildParams = (overrides?: Partial<Record<"type" | "unread", string>>) => {
    const params = new URLSearchParams()
    const nextType = overrides?.type ?? typeFilter
    const nextUnread =
      overrides?.unread ?? (showUnreadOnly ? "true" : "false")

    if (nextType !== "all") {
      params.set("type", nextType)
    }

    if (nextUnread === "true") {
      params.set("unread", "true")
    }

    params.set("page", "1")
    params.set("limit", limit.toString())

    return params
  }

  const handlePageChange = (nextPage: number) => {
    const params = buildParams()
    params.set("page", nextPage.toString())
    router.push(`/notifications?${params.toString()}`)
  }

  const handleNotificationRead = (id: string) => {
    setViewState((current) => {
      let didUpdate = false
      const items = current.items.map((notification) => {
        if (notification.id !== id || notification.isRead) {
          return notification
        }

        didUpdate = true
        return {
          ...notification,
          isRead: true,
        }
      })

      if (!didUpdate) {
        return current
      }

      return {
        items,
        unreadCount: Math.max(0, current.unreadCount - 1),
      }
    })
  }

  const handleMarkAllAsRead = () => {
    setViewState((current) => ({
      items: current.items.map((notification) =>
        notification.isRead
          ? notification
          : {
              ...notification,
              isRead: true,
            }
      ),
      unreadCount: 0,
    }))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
        <p className="text-muted-foreground">
          Stay updated with all your academy activities
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Notifications
          </CardTitle>
          <CardDescription>
            {viewState.unreadCount} unread notification{viewState.unreadCount !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-3">
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                router.push(`/notifications?${buildParams({ type: value }).toString()}`)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showUnreadOnly ? "default" : "outline"}
              onClick={() =>
                router.push(
                  `/notifications?${buildParams({
                    unread: showUnreadOnly ? "false" : "true",
                  }).toString()}`
                )
              }
            >
              Unread Only
            </Button>
          </div>

          <NotificationsList
            notifications={viewState.items}
            total={total}
            page={page}
            totalPages={Math.ceil(total / limit)}
            limit={limit}
            onPageChange={handlePageChange}
            onNotificationRead={handleNotificationRead}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
        </CardContent>
      </Card>
    </div>
  )
}
