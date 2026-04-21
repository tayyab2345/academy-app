import { redirect } from "next/navigation"
import { Session } from "next-auth"
import { prisma } from "@/lib/prisma"
import {
  formatRecoveryDeadline,
  isAcademyWithinRecoveryWindow,
} from "@/lib/academy-deletion"

export async function getAcademyLifecycleState(academyId: string) {
  const academy = await prisma.academy.findUnique({
    where: { id: academyId },
    select: {
      id: true,
      name: true,
      isDeleted: true,
      deletedAt: true,
      deletedByUserId: true,
      contactEmail: true,
      logoUrl: true,
      primaryColor: true,
      subdomain: true,
    },
  })

  if (!academy) {
    return null
  }

  return {
    ...academy,
    recoveryAvailable: isAcademyWithinRecoveryWindow(academy.deletedAt),
    recoveryDeadline: formatRecoveryDeadline(academy.deletedAt),
  }
}

export async function requireActiveDashboardSession(session: Session | null) {
  if (!session?.user) {
    redirect("/login")
  }

  const academyState = await getAcademyLifecycleState(session.user.academyId)

  if (!academyState) {
    redirect("/login")
  }

  if (academyState.isDeleted) {
    redirect("/academy-deactivated")
  }

  return {
    session,
    academyState,
  }
}
