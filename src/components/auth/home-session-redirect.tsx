"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

const roleRedirectMap: Record<string, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
}

export function HomeSessionRedirect() {
  const router = useRouter()
  const { data: session, status } = useSession()

  React.useEffect(() => {
    if (status !== "authenticated") {
      return
    }

    const redirectPath = session?.user?.role
      ? roleRedirectMap[session.user.role]
      : null

    if (redirectPath) {
      router.replace(redirectPath)
    }
  }, [router, session?.user?.role, status])

  return null
}
