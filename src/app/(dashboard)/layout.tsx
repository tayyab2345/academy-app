import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireActiveDashboardSession } from "@/lib/academy-session"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getUnreadNotificationCount } from "@/lib/notifications/notification-data"
import { Providers } from "@/app/providers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const { session: activeSession } = await requireActiveDashboardSession(session)

  const unreadNotificationCount = await getUnreadNotificationCount(
    activeSession.user.id
  )

  return (
    <Providers session={activeSession}>
      <DashboardShell
        currentUser={activeSession.user}
        unreadNotificationCount={unreadNotificationCount}
      >
        {children}
      </DashboardShell>
    </Providers>
  )
}
