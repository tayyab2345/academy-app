import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendPaymentReceivedWorkflow } from "@/lib/email/email-workflows"
import { calculateInvoiceStatus } from "@/lib/invoice-utils"
import { notifyManualPaymentApproved } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const submission = await prisma.manualPaymentSubmission.findFirst({
      where: {
        id: params.submissionId,
        academyId: session.user.academyId,
      },
      include: {
        invoice: {
          include: {
            payments: {
              where: { status: "completed" },
            },
            adjustments: true,
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    if (submission.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending submissions can be approved" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: submission.invoiceId,
          amount: submission.amount,
          currency: submission.invoice.currency,
          paymentMethod: submission.paymentMethod,
          transactionReference: submission.transactionId,
          paymentDate: submission.paymentDate,
          receiptUrl: submission.receiptUrl,
          notes: submission.note,
          status: "completed",
          recordedByUserId: session.user.id,
        },
      })

      const allPayments = await tx.payment.findMany({
        where: {
          invoiceId: submission.invoiceId,
          status: "completed",
        },
      })

      const totalPaid = allPayments.reduce(
        (sum, recordedPayment) => sum + Number(recordedPayment.amount),
        0
      )
      const adjustmentTotal = submission.invoice.adjustments.reduce(
        (sum, adjustment) => {
          if (adjustment.type === "surcharge") {
            return sum + Number(adjustment.amount)
          }

          return sum - Number(adjustment.amount)
        },
        0
      )
      const adjustedTotal = Number(submission.invoice.totalAmount) + adjustmentTotal
      const newStatus = calculateInvoiceStatus(
        adjustedTotal,
        totalPaid,
        submission.invoice.dueDate,
        submission.invoice.status
      )

      await tx.invoice.update({
        where: { id: submission.invoiceId },
        data: {
          status: newStatus,
          paidAt: newStatus === "paid" ? new Date() : null,
        },
      })

      const updatedSubmission = await tx.manualPaymentSubmission.update({
        where: { id: submission.id },
        data: {
          status: "approved",
          reviewedByUserId: session.user.id,
          reviewedAt: new Date(),
        },
      })

      return { payment, submission: updatedSubmission }
    })

    try {
      await notifyManualPaymentApproved(result.submission.id)
    } catch (notificationError) {
      console.error("Failed to send manual payment approval notifications:", notificationError)
    }

    void sendPaymentReceivedWorkflow(result.payment.id).catch((workflowError) => {
      console.error("Failed to send payment received emails:", workflowError)
    })

    return NextResponse.json({
      success: true,
      payment: result.payment,
      submission: result.submission,
    })
  } catch (error) {
    console.error("Failed to approve submission:", error)
    return NextResponse.json(
      { error: "Failed to approve submission" },
      { status: 500 }
    )
  }
}
