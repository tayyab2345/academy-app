import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { storeDocument } from "@/lib/storage/document-storage"
import { buildStoredReceiptFilename } from "@/lib/manual-payment-utils"
import { getReceiptAccessUrl } from "@/lib/manual-payment-submissions"

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "application/pdf",
])
const MAX_FILE_SIZE = 4 * 1024 * 1024

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WEBP, PDF" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
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
        { error: "Could not resolve uploader academy" },
        { status: 400 }
      )
    }

    const storageResult = await storeDocument(
      buffer,
      buildStoredReceiptFilename(
        file.name,
        academyId,
        session.user.id
      ),
      file.type
    )

    if (!storageResult.success) {
      throw new Error(storageResult.error || "Failed to store receipt")
    }

    return NextResponse.json({
      success: true,
      fileUrl: getReceiptAccessUrl(storageResult.fileUrl),
      storedFileUrl: storageResult.fileUrl,
      filename: storageResult.fileName,
      size: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error("Failed to upload receipt:", error)
    return NextResponse.json(
      { error: "Failed to upload receipt" },
      { status: 500 }
    )
  }
}
