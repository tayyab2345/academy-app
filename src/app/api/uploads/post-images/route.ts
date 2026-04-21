import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  buildStoredPostImageFilename,
  isSupportedPostImageMimeType,
  MAX_POST_IMAGE_SIZE,
} from "@/lib/post-media"
import { storeDocument } from "@/lib/storage/document-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "teacher")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file")
    const target = formData.get("target")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (target !== "post_image") {
      return NextResponse.json({ error: "Invalid upload target" }, { status: 400 })
    }

    if (!isSupportedPostImageMimeType(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, JPEG, WEBP" },
        { status: 400 }
      )
    }

    if (file.size > MAX_POST_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storageResult = await storeDocument(
      buffer,
      buildStoredPostImageFilename({
        academyId: session.user.academyId,
        userId: session.user.id,
        originalFileName: file.name,
        mimeType: file.type,
      }),
      file.type
    )

    if (!storageResult.success) {
      return NextResponse.json(
        { error: storageResult.error || "Failed to upload image" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fileUrl: storageResult.fileUrl,
      filename: storageResult.fileName,
      size: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error("Failed to upload post image:", error)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    )
  }
}
