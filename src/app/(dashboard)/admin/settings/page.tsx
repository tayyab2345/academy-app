import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AcademySettingsForm } from "@/components/admin/academy-settings-form"
import { ACADEMY_RECOVERY_WINDOW_DAYS } from "@/lib/academy-deletion"
import { getAdminTeamAccess, getAdminTeamMembers } from "@/lib/admin/admin-team"

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const [
    academy,
    teachers,
    students,
    parents,
    classes,
    adminTeamAccess,
    adminTeamMembers,
  ] = await Promise.all([
    prisma.academy.findUnique({
      where: { id: session.user.academyId },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        contactEmail: true,
      },
    }),
    prisma.user.count({
      where: {
        academyId: session.user.academyId,
        role: "teacher",
        isActive: true,
      },
    }),
    prisma.user.count({
      where: {
        academyId: session.user.academyId,
        role: "student",
        isActive: true,
      },
    }),
    prisma.user.count({
      where: {
        academyId: session.user.academyId,
        role: "parent",
        isActive: true,
      },
    }),
    prisma.class.count({
      where: {
        academyId: session.user.academyId,
      },
    }),
    getAdminTeamAccess(session.user.id),
    getAdminTeamMembers(session.user.academyId),
  ])

  if (!academy || !adminTeamAccess) {
    redirect("/admin")
  }

  return (
    <AcademySettingsForm
      academy={academy}
      deleteSummary={{
        teachers,
        students,
        parents,
        classes,
      }}
      recoveryWindowDays={ACADEMY_RECOVERY_WINDOW_DAYS}
      adminTeam={{
        admins: adminTeamMembers,
        currentUserId: session.user.id,
        canManageAdmins: adminTeamAccess.canManageAdmins,
        canChangePermissionType: adminTeamAccess.canChangePermissionType,
        canDeleteAdmins: adminTeamAccess.canDeleteAdmins,
      }}
    />
  )
}
