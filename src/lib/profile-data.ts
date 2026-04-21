import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getCurrentUserProfile(requiredRole?: "admin" | "teacher" | "student" | "parent") {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
    },
  })

  return user
}
