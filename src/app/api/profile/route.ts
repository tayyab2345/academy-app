import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSupportedStoredOrExternalImageUrl, normalizeOptionalMediaUrl } from "@/lib/media-url"
import { deleteStoredDocumentByUrl } from "@/lib/storage/document-storage"

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().optional().nullable().or(z.literal("")),
  avatarUrl: z.string().trim().optional().nullable().or(z.literal("")),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = profileSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid profile input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const nextAvatarUrl = normalizeOptionalMediaUrl(validated.data.avatarUrl)

    if (!isSupportedStoredOrExternalImageUrl(nextAvatarUrl)) {
      return NextResponse.json(
        { error: "Invalid profile image URL" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        avatarUrl: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        phone: validated.data.phone?.trim() || null,
        avatarUrl: nextAvatarUrl,
      },
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

    if (
      existingUser.avatarUrl &&
      existingUser.avatarUrl !== updatedUser.avatarUrl
    ) {
      await deleteStoredDocumentByUrl(existingUser.avatarUrl)
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error("Failed to update profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
