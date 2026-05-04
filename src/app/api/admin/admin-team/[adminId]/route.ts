import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { AdminPermissionType } from "@prisma/client"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { getAdminTeamAccess } from "@/lib/admin/admin-team"
import { prisma } from "@/lib/prisma"

const updateAdminSchema = z
  .object({
    isActive: z.boolean().optional(),
    adminPermissionType: z.enum(["full_admin", "limited_admin"]).optional(),
  })
  .refine(
    (value) =>
      typeof value.isActive === "boolean" ||
      typeof value.adminPermissionType === "string",
    "Nothing to update"
  )

export async function PATCH(
  req: NextRequest,
  { params }: { params: { adminId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = await getAdminTeamAccess(session.user.id)

    if (!access?.canManageAdmins) {
      return NextResponse.json(
        { error: "Only the academy owner or a full admin can manage admins." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = updateAdminSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid update", details: validated.error.errors },
        { status: 400 }
      )
    }

    if (validated.data.adminPermissionType && !access.canChangePermissionType) {
      return NextResponse.json(
        { error: "Only the academy owner can change admin permission type." },
        { status: 403 }
      )
    }

    const targetAdmin = await prisma.user.findFirst({
      where: {
        id: params.adminId,
        academyId: access.academyId,
        role: "admin",
      },
      select: {
        id: true,
        isAcademyOwner: true,
      },
    })

    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    if (targetAdmin.isAcademyOwner) {
      return NextResponse.json(
        { error: "The academy owner account cannot be changed here." },
        { status: 400 }
      )
    }

    if (
      targetAdmin.id === access.userId &&
      validated.data.isActive === false
    ) {
      return NextResponse.json(
        { error: "You cannot deactivate your own admin account." },
        { status: 400 }
      )
    }

    const updatedAdmin = await prisma.user.update({
      where: { id: targetAdmin.id },
      data: {
        ...(typeof validated.data.isActive === "boolean"
          ? { isActive: validated.data.isActive }
          : {}),
        ...(validated.data.adminPermissionType
          ? {
              adminPermissionType:
                validated.data.adminPermissionType as AdminPermissionType,
            }
          : {}),
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
    })

    return NextResponse.json({
      admin: {
        ...updatedAdmin,
        createdAt: updatedAdmin.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[admin-team][PATCH] failed", error)
    return NextResponse.json(
      { error: "Failed to update admin. Please try again." },
      { status: 500 }
    )
  }
}
