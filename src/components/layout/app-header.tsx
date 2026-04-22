"use client"

import { useSession } from "next-auth/react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { AcademyLogo } from "@/components/ui/academy-logo"
import { UserNav } from "./user-nav"

interface AppHeaderProps {
  onMenuClick?: () => void
  showMobileMenu?: boolean
  unreadNotificationCount: number
}

export function AppHeader({
  onMenuClick,
  showMobileMenu = false,
  unreadNotificationCount,
}: AppHeaderProps) {
  const { data: session } = useSession()
  const firstName = session?.user.firstName?.trim() || "there"
  const academyName = session?.user.academy?.name?.trim() || "AcademyFlow"

  return (
    <header
      className="sticky top-0 z-40 border-b bg-background"
      style={{
        borderColor: session?.user.academy?.primaryColor
          ? `${session.user.academy.primaryColor}20`
          : undefined
      }}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          {showMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          )}

          <div className="hidden md:block">
            <h1 className="text-lg font-semibold">
              {getGreeting()}, {firstName}!
            </h1>
            <p className="text-sm text-muted-foreground">
              {getCurrentDate()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-full border px-3 py-1.5 lg:flex">
            <AcademyLogo
              name={session?.user.academy?.name}
              logoUrl={session?.user.academy?.logoUrl}
              primaryColor={session?.user.academy?.primaryColor}
              className="h-8 w-8"
              iconClassName="h-4 w-4"
            />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Academy
              </p>
              <p className="line-clamp-1 text-sm font-medium">
                {academyName}
              </p>
            </div>
          </div>
          <NotificationBell initialUnreadCount={unreadNotificationCount} />
          <UserNav />
        </div>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <h1 className="text-lg font-semibold">
          {getGreeting()}, {firstName}!
        </h1>
        <p className="text-sm text-muted-foreground">
          {getCurrentDate()}
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <AcademyLogo
            name={session?.user.academy?.name}
            logoUrl={session?.user.academy?.logoUrl}
            primaryColor={session?.user.academy?.primaryColor}
            className="h-6 w-6"
            iconClassName="h-3 w-3"
          />
          <span>{academyName}</span>
        </div>
      </div>
    </header>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function getCurrentDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
