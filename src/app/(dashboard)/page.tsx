import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const roleRedirectMap: Record<string, string> = {
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/parent",
  }

  const redirectPath = roleRedirectMap[session.user.role]

  if (redirectPath) {
    redirect(redirectPath)
  }

  redirect("/login")
}
