import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  buildStoredAcademyLogoFilename,
  buildStoredUserAvatarFilename,
  isSupportedProfileImageMimeType,
  MAX_PROFILE_IMAGE_SIZE,
} from "@/lib/profile-media"
import { storeDocument } from "@/lib/storage/document-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file")
    const target = formData.get("target")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (target !== "user_avatar" && target !== "academy_logo") {
      return NextResponse.json({ error: "Invalid upload target" }, { status: 400 })
    }

    if (!isSupportedProfileImageMimeType(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, JPEG, WEBP" },
        { status: 400 }
      )
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB" },
        { status: 400 }
      )
    }

    if (target === "academy_logo" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let academyId = session.user.academyId

    if (!academyId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { academyId: true },
      })

      academyId = currentUser?.academyId || ""
    }

    if (!academyId) {
      return NextResponse.json(
        { error: "Could not resolve academy for upload" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename =
      target === "academy_logo"
        ? buildStoredAcademyLogoFilename(file.name, academyId, file.type)
        : buildStoredUserAvatarFilename(
            file.name,
            academyId,
            session.user.id,
            file.type
          )

    const storageResult = await storeDocument(buffer, filename, file.type)

    if (!storageResult.success) {
      throw new Error(storageResult.error || "Failed to store image")
    }

    return NextResponse.json({
      success: true,
      fileUrl: storageResult.fileUrl,
      filename: storageResult.fileName,
      size: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error("Failed to upload profile media:", error)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    )
  }
}
