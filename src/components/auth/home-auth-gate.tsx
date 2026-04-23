"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen"
import { getRoleRedirectPath } from "@/lib/role-redirect"

export function HomeAuthGate({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { data: session, status } = useSession()

  React.useEffect(() => {
    if (status !== "authenticated") {
      return
    }

    router.replace(getRoleRedirectPath(session?.user?.role))
  }, [router, session?.user?.role, status])

  if (status === "loading" || status === "authenticated") {
    return <AuthLoadingScreen />
  }

  return <>{children}</>
}
