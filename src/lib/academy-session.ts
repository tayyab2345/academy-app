import { redirect } from "next/navigation"
import { Session } from "next-auth"
import { formatPrismaError, prisma } from "@/lib/prisma"
import {
  formatRecoveryDeadline,
  isAcademyWithinRecoveryWindow,
} from "@/lib/academy-deletion"
import { hasUsableDashboardIdentity } from "@/lib/role-redirect"

const SESSION_LOOKUP_RETRY_DELAYS_MS = [150, 350, 700]

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
  const candidateUser = session?.user as
    | {
        id?: unknown
        role?: unknown
        academyId?: unknown
      }
    | undefined

  if (!session || !hasUsableDashboardIdentity(candidateUser)) {
    console.warn("[dashboard-session] incomplete session identity", {
      hasSession: Boolean(session),
      hasUser: Boolean(candidateUser),
      userId: candidateUser?.id ?? null,
      role: candidateUser?.role ?? null,
      hasAcademyId: Boolean(candidateUser?.academyId),
    })
    redirect("/login")
  }

  const user = candidateUser

  let academyState: Awaited<ReturnType<typeof getAcademyLifecycleState>> = null
  let userState: {
    id: string
    academyId: string
    isActive: boolean
  } | null = null
  let lastLookupError: unknown = null

  for (let attempt = 0; attempt < SESSION_LOOKUP_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      ;[academyState, userState] = await Promise.all([
        getAcademyLifecycleState(user.academyId),
        prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            academyId: true,
            isActive: true,
          },
        }),
      ])

      if (academyState && userState) {
        break
      }
    } catch (error) {
      lastLookupError = error
      console.warn("[dashboard-session] profile lookup retry failed", {
        userId: user.id,
        academyId: user.academyId,
        attempt: attempt + 1,
        prisma: formatPrismaError(error),
      })
    }

    await wait(SESSION_LOOKUP_RETRY_DELAYS_MS[attempt])
  }

  if (lastLookupError && (!academyState || !userState)) {
    console.error("[dashboard-session] profile lookup failed after retries", {
      userId: user.id,
      academyId: user.academyId,
      prisma: formatPrismaError(lastLookupError),
    })
    redirect("/login")
  }

  if (
    !userState ||
    !userState.isActive ||
    userState.academyId !== user.academyId
  ) {
    console.warn("[dashboard-session] inactive or mismatched app user", {
      userId: user.id,
      academyId: user.academyId,
      found: Boolean(userState),
      foundAcademyId: userState?.academyId ?? null,
      isActive: userState?.isActive ?? null,
    })
    redirect("/login")
  }

  if (!academyState) {
    console.warn("[dashboard-session] academy not found", {
      userId: user.id,
      academyId: user.academyId,
    })
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
