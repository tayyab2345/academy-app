import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { buildStoredResultFileFilename } from "@/lib/results/result-media"
import { storeDocument } from "@/lib/storage/document-storage"

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]
const PDF_MIME_TYPES = ["application/pdf"]
const MAX_FILE_SIZE = 4 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin" && session.user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file")
    const target = formData.get("target")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (target !== "result_pdf" && target !== "result_image") {
      return NextResponse.json({ error: "Invalid upload target" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB." },
        { status: 400 }
      )
    }

    const isPdfTarget = target === "result_pdf"
    const allowedMimeTypes = isPdfTarget ? PDF_MIME_TYPES : IMAGE_MIME_TYPES

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: isPdfTarget
            ? "Invalid file type. Only PDF files are allowed."
            : "Invalid file type. Allowed: JPEG, PNG, WEBP",
        },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storageResult = await storeDocument(
      buffer,
      buildStoredResultFileFilename({
        academyId: session.user.academyId,
        userId: session.user.id,
        kind: isPdfTarget ? "pdf" : "image",
        originalFileName: file.name,
      }),
      file.type
    )

    if (!storageResult.success) {
      return NextResponse.json(
        { error: storageResult.error || "Failed to upload result file" },
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
    console.error("Failed to upload result file:", error)
    return NextResponse.json(
      { error: "Failed to upload result file" },
      { status: 500 }
    )
  }
}
