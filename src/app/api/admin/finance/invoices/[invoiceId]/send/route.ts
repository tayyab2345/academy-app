import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendInvoiceSentWorkflow } from "@/lib/email/email-workflows"
import { notifyInvoiceSent } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.invoiceId,
        studentProfile: {
          user: {
            academyId: session.user.academyId,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (invoice.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft invoices can be sent" },
        { status: 400 }
      )
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.invoiceId },
      data: {
        status: "sent",
        issuedAt: new Date(),
      },
    })

    try {
      await notifyInvoiceSent(params.invoiceId)
    } catch (notificationError) {
      console.error("Failed to send invoice notifications:", notificationError)
    }

    void sendInvoiceSentWorkflow(params.invoiceId).catch((workflowError) => {
      console.error("Failed to send invoice emails:", workflowError)
    })

    return NextResponse.json({ invoice: updatedInvoice })
  } catch (error) {
    console.error("Failed to send invoice:", error)
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    )
  }
}
