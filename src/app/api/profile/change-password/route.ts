import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  createOrLinkSupabasePasswordUser,
  getLinkedSupabaseAuthUserId,
  isSupabaseAdminAuthConfigured,
  isSupabasePasswordAuthConfigured,
  normalizeAuthEmail,
  signInWithSupabasePassword,
  updateSupabasePasswordUser,
} from "@/lib/supabase-auth"

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "Confirm password must match the new password",
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current password",
  })

function passwordChangeUnavailableResponse() {
  return NextResponse.json(
    {
      error:
        "Password changes are temporarily unavailable. Please contact your academy admin.",
    },
    { status: 503 }
  )
}

function mapSupabasePasswordError(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  if (message.includes("weak") || message.includes("password")) {
    return "This password is too weak. Please choose a stronger password."
  }

  return "Could not update your password right now. Please try again."
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 }
      )
    }

    if (!isSupabasePasswordAuthConfigured() || !isSupabaseAdminAuthConfigured()) {
      console.warn("[profile/change-password] Supabase Auth is not fully configured")
      return passwordChangeUnavailableResponse()
    }

    const body = await req.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid password input", details: parsed.error.errors },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        supabaseAuthUserId: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        academyId: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Your account is not available. Please sign in again." },
        { status: 401 }
      )
    }

    const normalizedEmail = normalizeAuthEmail(user.email)
    let supabaseAuthUserId = getLinkedSupabaseAuthUserId(user)
    let verifiedCurrentPassword = false

    const supabaseSignIn = await signInWithSupabasePassword(
      normalizedEmail,
      parsed.data.currentPassword
    )

    if (supabaseSignIn.ok) {
      const signedInEmail = normalizeAuthEmail(supabaseSignIn.user.email || "")
      const matchesCurrentUser =
        signedInEmail === normalizedEmail &&
        (!supabaseAuthUserId || supabaseSignIn.user.id === supabaseAuthUserId)

      if (!matchesCurrentUser) {
        console.warn("[profile/change-password] Supabase user mismatch", {
          userId: user.id,
          supabaseAuthUserId,
          signedInSupabaseUserId: supabaseSignIn.user.id,
        })

        return NextResponse.json(
          { error: "Could not verify this account securely." },
          { status: 403 }
        )
      }

      supabaseAuthUserId = supabaseSignIn.user.id
      verifiedCurrentPassword = true
    } else if (supabaseSignIn.unavailable) {
      console.warn("[profile/change-password] Supabase password verification unavailable", {
        userId: user.id,
        message: supabaseSignIn.message,
      })
      return passwordChangeUnavailableResponse()
    }

    // Legacy owner/admin accounts may still have a local hash from older registration.
    // Verify once, then migrate the password into Supabase Auth and clear the local hash.
    if (!verifiedCurrentPassword && user.passwordHash) {
      verifiedCurrentPassword = await bcrypt.compare(
        parsed.data.currentPassword,
        user.passwordHash
      )
    }

    if (!verifiedCurrentPassword) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      )
    }

    try {
      if (!supabaseAuthUserId) {
        const authUser = await createOrLinkSupabasePasswordUser({
          email: normalizedEmail,
          password: parsed.data.newPassword,
          role: user.role,
          academyId: user.academyId,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
        })

        supabaseAuthUserId = authUser.user.id
      }

      await updateSupabasePasswordUser(supabaseAuthUserId, {
        password: parsed.data.newPassword,
        role: user.role,
        academyId: user.academyId,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      })
    } catch (error) {
      console.error("[profile/change-password] Supabase password update failed", {
        userId: user.id,
        supabaseAuthUserId,
        error,
      })

      return NextResponse.json(
        { error: mapSupabasePasswordError(error) },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        supabaseAuthUserId,
        passwordHash: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    })
  } catch (error) {
    console.error("[profile/change-password] failed", error)

    return NextResponse.json(
      { error: "Could not change your password right now. Please try again." },
      { status: 500 }
    )
  }
}
