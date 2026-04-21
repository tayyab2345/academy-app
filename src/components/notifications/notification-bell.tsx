"use client"

import { NotificationsPanel } from "./notifications-panel"

interface NotificationBellProps {
  initialUnreadCount: number
}

export function NotificationBell({
  initialUnreadCount,
}: NotificationBellProps) {
  return <NotificationsPanel initialUnreadCount={initialUnreadCount} />
}
