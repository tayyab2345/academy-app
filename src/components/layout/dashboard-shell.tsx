"use client"

import { useState } from "react"
import type { Session } from "next-auth"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"

export function DashboardShell({
  children,
  currentUser,
  unreadNotificationCount,
}: {
  children: React.ReactNode
  currentUser: Session["user"]
  unreadNotificationCount: number
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:block md:w-64 lg:w-72">
        <AppSidebar currentUser={currentUser} />
      </aside>

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 md:hidden">
            <AppSidebar currentUser={currentUser} />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          currentUser={currentUser}
          showMobileMenu
          unreadNotificationCount={unreadNotificationCount}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-muted/10 p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
