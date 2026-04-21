import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getNotificationsPageData } from "@/lib/notifications/notification-data"
import { NotificationsPageContent } from "@/components/notifications/notifications-page-content"

interface NotificationsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    type?: string | string[]
    unread?: string | string[]
  }
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max: number = 100
) {
  const parsed = Number.parseInt(value || "", 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.min(parsed, max)
}

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 20)
  const type = getSingleSearchParam(searchParams?.type) || ""
  const showUnreadOnly = getSingleSearchParam(searchParams?.unread) === "true"

  const data = await getNotificationsPageData({
    userId: session.user.id,
    page,
    limit,
    unreadOnly: showUnreadOnly,
    type,
  })

  return (
    <NotificationsPageContent
      key={`${type}-${showUnreadOnly}-${page}-${limit}`}
      notifications={data.notifications}
      total={data.total}
      unreadCount={data.unreadCount}
      page={page}
      limit={limit}
      appliedTypeFilter={type}
      showUnreadOnly={showUnreadOnly}
    />
  )
}
