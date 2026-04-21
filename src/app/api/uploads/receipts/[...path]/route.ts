import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { parseStoredReceiptAccessInfo } from "@/lib/manual-payment-utils"
import { buildStoredFileResponse } from "@/lib/pdf/document-service"
import {
  getDocumentUrlFromRelativePath,
  normalizeStoredRelativePath,
  readStoredDocumentFromUrl,
} from "@/lib/storage/document-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const relativePath = normalizeStoredRelativePath(params.path.join("/"))

  if (!relativePath) {
    return NextResponse.json({ error: "Invalid receipt path" }, { status: 400 })
  }

  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const fileName = path.posix.basename(relativePath)
  const accessInfo = parseStoredReceiptAccessInfo(fileName)

  if (!accessInfo) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
  }

  const isUploader = accessInfo.userId === session.user.id
  const isAcademyAdmin =
    session.user.role === "admin" && accessInfo.academyId === session.user.academyId

  if (!isUploader && !isAcademyAdmin) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
  }

  const fileUrl = getDocumentUrlFromRelativePath(relativePath)
  const storedDocument = await readStoredDocumentFromUrl(fileUrl)

  if (!storedDocument) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
  }

  const disposition =
    req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline"

  return buildStoredFileResponse(
    storedDocument.buffer,
    storedDocument.fileName,
    disposition
  )
}
