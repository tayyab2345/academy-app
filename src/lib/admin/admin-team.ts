import type { AdminPermissionType } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type AdminTeamMember = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  adminPermissionType: AdminPermissionType | null
  isActive: boolean
  isAcademyOwner: boolean
  createdAt: string
}

export type AdminTeamAccess = {
  userId: string
  academyId: string
  isAcademyOwner: boolean
  isFullAdmin: boolean
  canManageAdmins: boolean
  canChangePermissionType: boolean
  canDeleteAdmins: boolean
}

export function getAdminTypeLabel(
  adminPermissionType: AdminPermissionType | null,
  isAcademyOwner: boolean
) {
  if (isAcademyOwner) {
    return "Academy Owner"
  }

  if (adminPermissionType === "limited_admin") {
    return "Limited Admin"
  }

  return "Full Admin"
}

export function isFullAdminPermission(
  adminPermissionType: AdminPermissionType | null,
  isAcademyOwner: boolean
) {
  return isAcademyOwner || adminPermissionType === "full_admin"
}

export async function getAdminTeamAccess(userId: string): Promise<AdminTeamAccess | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      academyId: true,
      isActive: true,
      isAcademyOwner: true,
      adminPermissionType: true,
    },
  })

  if (!user || !user.isActive || user.role !== "admin") {
    return null
  }

  const isFullAdmin = isFullAdminPermission(
    user.adminPermissionType,
    user.isAcademyOwner
  )

  return {
    userId: user.id,
    academyId: user.academyId,
    isAcademyOwner: user.isAcademyOwner,
    isFullAdmin,
    canManageAdmins: isFullAdmin,
    canChangePermissionType: user.isAcademyOwner,
    canDeleteAdmins: user.isAcademyOwner,
  }
}

export async function getAdminTeamMembers(
  academyId: string
): Promise<AdminTeamMember[]> {
  const admins = await prisma.user.findMany({
    where: {
      academyId,
      role: "admin",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      adminPermissionType: true,
      isActive: true,
      isAcademyOwner: true,
      createdAt: true,
    },
    orderBy: [
      { isAcademyOwner: "desc" },
      { createdAt: "asc" },
    ],
  })

  return admins.map((admin) => ({
    ...admin,
    createdAt: admin.createdAt.toISOString(),
  }))
}
