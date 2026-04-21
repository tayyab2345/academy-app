import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Role } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { canUserAccessStoredDocument, DocumentAccessUser } from "@/lib/document-access"
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
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const relativePath = normalizeStoredRelativePath(params.path.join("/"))

    if (!relativePath) {
      return NextResponse.json({ error: "Invalid document path" }, { status: 400 })
    }

    const accessUser: DocumentAccessUser = {
      id: session.user.id,
      role: session.user.role as Role,
      academyId: session.user.academyId,
    }

    const canAccess = await canUserAccessStoredDocument(accessUser, relativePath)

    if (!canAccess) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const fileUrl = getDocumentUrlFromRelativePath(relativePath)
    const storedDocument = await readStoredDocumentFromUrl(fileUrl)

    if (!storedDocument) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const disposition =
      req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline"

    return buildStoredFileResponse(
      storedDocument.buffer,
      storedDocument.fileName,
      disposition
    )
  } catch (error) {
    console.error("Failed to serve stored document:", error)
    return NextResponse.json(
      { error: "Failed to serve document" },
      { status: 500 }
    )
  }
}
