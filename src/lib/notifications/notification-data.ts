import { NotificationType, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const notificationTypes = Object.values(NotificationType)

export type NotificationPageItem = {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  actionUrl: string | null
  createdAt: string
}

export type NotificationsPageData = {
  notifications: NotificationPageItem[]
  total: number
  unreadCount: number
  page: number
  totalPages: number
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  })
}

function isNotificationType(value: string): value is NotificationType {
  return notificationTypes.includes(value as NotificationType)
}

export async function getNotificationsPageData(input: {
  userId: string
  page: number
  limit: number
  unreadOnly: boolean
  type: string
}): Promise<NotificationsPageData> {
  const where: Prisma.NotificationWhereInput = {
    userId: input.userId,
  }

  if (input.unreadOnly) {
    where.isRead = false
  }

  if (isNotificationType(input.type)) {
    where.type = input.type
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        actionUrl: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.notification.count({ where }),
    getUnreadNotificationCount(input.userId),
  ])

  return {
    notifications: notifications.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    })),
    total,
    unreadCount,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  }
}
