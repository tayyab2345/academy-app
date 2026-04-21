import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isSupportedStoredOrExternalImageUrl, normalizeOptionalMediaUrl } from "@/lib/media-url"
import { deleteStoredDocumentByUrl } from "@/lib/storage/document-storage"

const settingsSchema = z.object({
  name: z.string().trim().min(2),
  logoUrl: z.string().trim().optional().nullable().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  contactEmail: z.string().trim().email(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validatedData = settingsSchema.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: validatedData.error.errors },
        { status: 400 }
      )
    }

    const nextLogoUrl = normalizeOptionalMediaUrl(validatedData.data.logoUrl)

    if (!isSupportedStoredOrExternalImageUrl(nextLogoUrl)) {
      return NextResponse.json(
        { error: "Invalid academy logo URL" },
        { status: 400 }
      )
    }

    const existingAcademy = await prisma.academy.findUnique({
      where: { id: session.user.academyId },
      select: {
        id: true,
        logoUrl: true,
      },
    })

    if (!existingAcademy) {
      return NextResponse.json(
        { error: "Academy not found" },
        { status: 404 }
      )
    }

    const { name, primaryColor, contactEmail } = validatedData.data

    const updatedAcademy = await prisma.academy.update({
      where: { id: session.user.academyId },
      data: {
        name,
        logoUrl: nextLogoUrl,
        primaryColor,
        contactEmail,
      },
    })

    if (
      existingAcademy.logoUrl &&
      existingAcademy.logoUrl !== updatedAcademy.logoUrl
    ) {
      await deleteStoredDocumentByUrl(existingAcademy.logoUrl)
    }

    return NextResponse.json({
      success: true,
      academy: updatedAcademy,
    })
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
