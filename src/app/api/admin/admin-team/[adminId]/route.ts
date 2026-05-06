import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma, type AdminPermissionType } from "@prisma/client"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { getAdminTeamAccess } from "@/lib/admin/admin-team"
import { prisma } from "@/lib/prisma"
import {
  deleteSupabaseAuthUser,
  findSupabaseAuthUserByEmail,
  getLinkedSupabaseAuthUserId,
  isSupabaseAdminAuthConfigured,
} from "@/lib/supabase-auth"

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

async function reassignAdminAuditReferences(
  tx: Prisma.TransactionClient,
  input: {
    academyId: string
    targetUserId: string
    fallbackUserId: string
  }
) {
  const { academyId, targetUserId, fallbackUserId } = input

  await tx.invoice.updateMany({
    where: {
      createdByUserId: targetUserId,
      studentProfile: {
        user: {
          academyId,
        },
      },
    },
    data: {
      createdByUserId: fallbackUserId,
    },
  })

  await tx.payment.updateMany({
    where: {
      recordedByUserId: targetUserId,
      invoice: {
        studentProfile: {
          user: {
            academyId,
          },
        },
      },
    },
    data: {
      recordedByUserId: fallbackUserId,
    },
  })

  await tx.invoiceAdjustment.updateMany({
    where: {
      createdByUserId: targetUserId,
      invoice: {
        studentProfile: {
          user: {
            academyId,
          },
        },
      },
    },
    data: {
      createdByUserId: fallbackUserId,
    },
  })

  await tx.staffCompensationProfile.updateMany({
    where: {
      academyId,
      createdByUserId: targetUserId,
    },
    data: {
      createdByUserId: fallbackUserId,
    },
  })

  await tx.staffCompensationProfile.updateMany({
    where: {
      academyId,
      updatedByUserId: targetUserId,
    },
    data: {
      updatedByUserId: null,
    },
  })

  await tx.payrollRecord.updateMany({
    where: {
      academyId,
      createdByUserId: targetUserId,
    },
    data: {
      createdByUserId: fallbackUserId,
    },
  })

  await tx.payrollRecord.updateMany({
    where: {
      academyId,
      updatedByUserId: targetUserId,
    },
    data: {
      updatedByUserId: null,
    },
  })

  await tx.payrollRecord.updateMany({
    where: {
      academyId,
      finalizedByUserId: targetUserId,
    },
    data: {
      finalizedByUserId: null,
    },
  })

  await tx.payrollAdjustment.updateMany({
    where: {
      createdByUserId: targetUserId,
      payrollRecord: {
        academyId,
      },
    },
    data: {
      createdByUserId: null,
    },
  })

  await tx.payrollAdjustment.updateMany({
    where: {
      updatedByUserId: targetUserId,
      payrollRecord: {
        academyId,
      },
    },
    data: {
      updatedByUserId: null,
    },
  })

  await tx.exam.updateMany({
    where: {
      academyId,
      createdByUserId: targetUserId,
    },
    data: {
      createdByUserId: fallbackUserId,
    },
  })

  await tx.resultFile.updateMany({
    where: {
      uploadedByUserId: targetUserId,
      exam: {
        academyId,
      },
    },
    data: {
      uploadedByUserId: fallbackUserId,
    },
  })

  await tx.reportAttachment.updateMany({
    where: {
      uploadedByUserId: targetUserId,
      report: {
        class: {
          academyId,
        },
      },
    },
    data: {
      uploadedByUserId: fallbackUserId,
    },
  })

  await tx.manualPaymentSubmission.updateMany({
    where: {
      academyId,
      submittedByUserId: targetUserId,
    },
    data: {
      submittedByUserId: fallbackUserId,
    },
  })

  await tx.manualPaymentSubmission.updateMany({
    where: {
      academyId,
      reviewedByUserId: targetUserId,
    },
    data: {
      reviewedByUserId: null,
    },
  })

  await tx.academy.updateMany({
    where: {
      id: academyId,
      deletedByUserId: targetUserId,
    },
    data: {
      deletedByUserId: null,
    },
  })

  await tx.emailLog.updateMany({
    where: {
      recipientUserId: targetUserId,
    },
    data: {
      recipientUserId: null,
    },
  })
}

async function resolveSupabaseAuthUserIdForDeletion(admin: {
  id: string
  email: string
  supabaseAuthUserId: string | null
}) {
  const linkedAuthUserId = getLinkedSupabaseAuthUserId(admin)

  if (linkedAuthUserId) {
    return linkedAuthUserId
  }

  if (!isSupabaseAdminAuthConfigured()) {
    console.warn("[admin-team][DELETE] Supabase Auth admin is not configured", {
      adminId: admin.id,
      email: admin.email,
    })
    return null
  }

  const authUser = await findSupabaseAuthUserByEmail(admin.email)
  return authUser?.id ?? null
}

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { adminId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = await getAdminTeamAccess(session.user.id)

    if (!access?.canDeleteAdmins) {
      return NextResponse.json(
        { error: "Only the academy owner can permanently delete admins." },
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
        email: true,
        firstName: true,
        lastName: true,
        isAcademyOwner: true,
        supabaseAuthUserId: true,
      },
    })

    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    if (targetAdmin.id === access.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account." },
        { status: 400 }
      )
    }

    if (targetAdmin.isAcademyOwner) {
      return NextResponse.json(
        { error: "The academy owner account cannot be deleted from Admin Team." },
        { status: 400 }
      )
    }

    const adminCount = await prisma.user.count({
      where: {
        academyId: access.academyId,
        role: "admin",
      },
    })

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "You cannot delete the last remaining admin in this academy." },
        { status: 400 }
      )
    }

    let supabaseAuthUserId: string | null = null

    try {
      supabaseAuthUserId = await resolveSupabaseAuthUserIdForDeletion(targetAdmin)

      if (supabaseAuthUserId) {
        await deleteSupabaseAuthUser(supabaseAuthUserId)
      }
    } catch (error) {
      console.error("[admin-team][DELETE][supabase-auth] failed", {
        adminId: targetAdmin.id,
        email: targetAdmin.email,
        supabaseAuthUserId,
        error,
      })
      return NextResponse.json(
        {
          error:
            "Could not delete this admin from Supabase Auth. Please try again.",
        },
        { status: 502 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await reassignAdminAuditReferences(tx, {
        academyId: access.academyId,
        targetUserId: targetAdmin.id,
        fallbackUserId: access.userId,
      })

      await tx.notification.create({
        data: {
          academyId: access.academyId,
          userId: access.userId,
          type: "announcement",
          title: "Admin deleted",
          message: `${targetAdmin.firstName} ${targetAdmin.lastName} was permanently deleted by the academy owner.`,
          entityType: "admin",
          entityId: targetAdmin.id,
        },
      })

      await tx.user.delete({
        where: {
          id: targetAdmin.id,
        },
      })
    })

    return NextResponse.json({
      success: true,
      deletedAdminId: targetAdmin.id,
    })
  } catch (error) {
    console.error("[admin-team][DELETE] failed", error)
    return NextResponse.json(
      { error: "Failed to delete admin. Please try again." },
      { status: 500 }
    )
  }
}
