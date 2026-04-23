"use client"

import { Suspense, lazy } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

const NotificationsPanel = lazy(() =>
  import("./notifications-panel").then((mod) => ({
    default: mod.NotificationsPanel,
  }))
)

interface NotificationBellProps {
  initialUnreadCount: number
}

export function NotificationBell({
  initialUnreadCount,
}: NotificationBellProps) {
  return (
    <Suspense
      fallback={
        <NotificationBellFallback initialUnreadCount={initialUnreadCount} />
      }
    >
      <NotificationsPanel initialUnreadCount={initialUnreadCount} />
    </Suspense>
  )
}

function NotificationBellFallback({
  initialUnreadCount,
}: NotificationBellProps) {
  return (
    <Button variant="ghost" size="icon" className="relative" disabled>
      <Bell className="h-5 w-5" />
      {initialUnreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
          {initialUnreadCount > 9 ? "9+" : initialUnreadCount}
        </span>
      )}
      <span className="sr-only">Notifications</span>
    </Button>
  )
}
