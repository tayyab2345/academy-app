import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Role } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { DocumentAccessUser, getInvoiceWhereForUser } from "@/lib/document-access"
import { ensureStoredInvoicePdf } from "@/lib/pdf/document-service"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  _req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessUser: DocumentAccessUser = {
      id: session.user.id,
      role: Role.admin,
      academyId: session.user.academyId,
    }

    const where = await getInvoiceWhereForUser(accessUser, params.invoiceId)

    if (!where) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = await prisma.invoice.findFirst({
      where,
      select: { id: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const storedDocument = await ensureStoredInvoicePdf(params.invoiceId)

    if (!storedDocument) {
      return NextResponse.json(
        { error: "Unable to generate invoice PDF" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pdfUrl: storedDocument.fileUrl,
      fileName: storedDocument.fileName,
      downloadUrl: `/api/admin/finance/invoices/${params.invoiceId}/download`,
    })
  } catch (error) {
    console.error("Failed to generate invoice PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 }
    )
  }
}
