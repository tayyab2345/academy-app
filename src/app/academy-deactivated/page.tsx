import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getAcademyLifecycleState } from "@/lib/academy-session"
import { AcademyDeactivatedPanel } from "@/components/academy/academy-deactivated-panel"

export const metadata: Metadata = {
  title: "Academy Deactivated - AcademyFlow",
  description: "Academy access has been deactivated",
}

export default async function AcademyDeactivatedPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return (
      <AcademyDeactivatedPanel
        academyName={null}
        deletedAt={null}
        recoveryDeadline={null}
        recoveryAvailable={false}
        canRestore={false}
      />
    )
  }

  const academyState = await getAcademyLifecycleState(session.user.academyId)

  if (!academyState) {
    redirect("/login")
  }

  if (!academyState.isDeleted) {
    redirect("/")
  }

  return (
    <AcademyDeactivatedPanel
      academyName={academyState.name}
      deletedAt={academyState.deletedAt?.toISOString() ?? null}
      recoveryDeadline={academyState.recoveryDeadline}
      recoveryAvailable={academyState.recoveryAvailable}
      canRestore={
        session.user.role === "admin" && academyState.recoveryAvailable
      }
    />
  )
}
