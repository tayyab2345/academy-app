import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Role } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { buildPdfFileResponse, ensureStoredPayrollSlipPdf } from "@/lib/pdf/document-service"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: { recordId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const where =
      session.user.role === Role.admin
        ? {
            id: params.recordId,
            academyId: session.user.academyId,
          }
        : session.user.role === Role.teacher
          ? {
              id: params.recordId,
              academyId: session.user.academyId,
              userId: session.user.id,
              isFinalized: true,
            }
          : null

    if (!where) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const record = await prisma.payrollRecord.findFirst({
      where,
      select: {
        id: true,
      },
    })

    if (!record) {
      return NextResponse.json(
        { error: "Payroll salary slip not found" },
        { status: 404 }
      )
    }

    const storedDocument = await ensureStoredPayrollSlipPdf(record.id)

    if (!storedDocument) {
      return NextResponse.json(
        { error: "Unable to generate salary slip PDF" },
        { status: 500 }
      )
    }

    return buildPdfFileResponse(
      storedDocument.buffer,
      storedDocument.fileName,
      "attachment"
    )
  } catch (error) {
    console.error("Failed to download salary slip:", error)
    return NextResponse.json(
      { error: "Failed to download salary slip" },
      { status: 500 }
    )
  }
}
