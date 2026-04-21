import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Role } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { DocumentAccessUser, getReportWhereForUser } from "@/lib/document-access"
import { buildPdfFileResponse, ensureStoredReportPdf } from "@/lib/pdf/document-service"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessUser: DocumentAccessUser = {
      id: session.user.id,
      role: session.user.role as Role,
      academyId: session.user.academyId,
    }

    const where = await getReportWhereForUser(accessUser, params.reportId)

    if (!where) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    const report = await prisma.report.findFirst({
      where,
      select: {
        id: true,
        pdfUrl: true,
      },
    })

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    const storedDocument = await ensureStoredReportPdf(report.id)

    if (!storedDocument) {
      return NextResponse.json(
        { error: "Unable to generate report PDF" },
        { status: 500 }
      )
    }

    return buildPdfFileResponse(
      storedDocument.buffer,
      storedDocument.fileName,
      "attachment"
    )
  } catch (error) {
    console.error("Failed to download report:", error)
    return NextResponse.json(
      { error: "Failed to download report" },
      { status: 500 }
    )
  }
}
