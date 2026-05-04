import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { AdminPermissionType } from "@prisma/client"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import {
  getAdminTeamAccess,
  getAdminTeamMembers,
} from "@/lib/admin/admin-team"
import { prisma } from "@/lib/prisma"

const createAdminSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Please enter a valid email address"),
    phone: z.string().trim().optional().nullable().or(z.literal("")),
    adminPermissionType: z.enum(["full_admin", "limited_admin"]),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Confirm password must match password",
    path: ["confirmPassword"],
  })

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = await getAdminTeamAccess(session.user.id)

    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admins = await getAdminTeamMembers(access.academyId)

    return NextResponse.json({
      admins,
      access,
    })
  } catch (error) {
    console.error("[admin-team][GET] failed", error)
    return NextResponse.json(
      { error: "Failed to fetch admin team" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const access = await getAdminTeamAccess(session.user.id)

    if (!access?.canManageAdmins) {
      return NextResponse.json(
        { error: "Only the academy owner or a full admin can add admins." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = createAdminSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid admin details", details: validated.error.errors },
        { status: 400 }
      )
    }

    const normalizedEmail = normalizeEmail(validated.data.email)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        academyId: true,
        role: true,
      },
    })

    if (existingUser) {
      const message =
        existingUser.academyId === access.academyId
          ? existingUser.role === "admin"
            ? "This email is already an admin in this academy."
            : "This email is already used by another user in this academy."
          : "This email is already registered. Please use another email."

      return NextResponse.json({ error: message }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(validated.data.password, 10)

    const admin = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "admin",
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        phone: validated.data.phone?.trim() || null,
        academyId: access.academyId,
        isActive: true,
        isAcademyOwner: false,
        adminPermissionType:
          validated.data.adminPermissionType as AdminPermissionType,
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

    return NextResponse.json(
      {
        admin: {
          ...admin,
          createdAt: admin.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[admin-team][POST] failed", error)
    return NextResponse.json(
      { error: "Failed to add admin. Please try again." },
      { status: 500 }
    )
  }
}
