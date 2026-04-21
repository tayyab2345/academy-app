import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { calculateOutstandingAmount } from "@/lib/invoice-utils"
import { normalizeReceiptUrl, manualPaymentSubmissionInputSchema } from "@/lib/manual-payment-submissions"
import { notifyManualPaymentSubmitted } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!parentProfile) {
      return NextResponse.json({ error: "Parent profile not found" }, { status: 403 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.invoiceId },
      include: {
        studentProfile: {
          include: {
            user: {
              select: {
                academyId: true,
              },
            },
            parentLinks: {
              where: { parentProfileId: parentProfile.id },
              select: { id: true },
            },
          },
        },
        payments: {
          where: { status: "completed" },
        },
        adjustments: true,
      },
    })

    if (!invoice || invoice.studentProfile.parentLinks.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (invoice.status === "paid" || invoice.status === "waived") {
      return NextResponse.json(
        { error: "This invoice is already paid or waived" },
        { status: 400 }
      )
    }

    if (invoice.status === "draft") {
      return NextResponse.json(
        { error: "This invoice is not available for payment yet" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const validated = manualPaymentSubmissionInputSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const paidAmount = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    )
    const outstanding = calculateOutstandingAmount(
      Number(invoice.totalAmount),
      paidAmount,
      invoice.adjustments.map((adjustment) => ({
        type: adjustment.type,
        amount: Number(adjustment.amount),
      }))
    )

    if (validated.data.amount > outstanding) {
      return NextResponse.json(
        {
          error: `Payment amount exceeds outstanding balance of ${outstanding.toFixed(2)}`,
        },
        { status: 400 }
      )
    }

    const existingPending = await prisma.manualPaymentSubmission.findFirst({
      where: {
        invoiceId: params.invoiceId,
        status: "pending",
      },
      select: { id: true },
    })

    if (existingPending) {
      return NextResponse.json(
        { error: "There is already a pending payment submission for this invoice" },
        { status: 400 }
      )
    }

    const normalizedReceiptUrl = normalizeReceiptUrl(validated.data.receiptUrl)

    if (validated.data.receiptUrl && !normalizedReceiptUrl) {
      return NextResponse.json(
        { error: "Invalid receipt URL" },
        { status: 400 }
      )
    }

    const submission = await prisma.manualPaymentSubmission.create({
      data: {
        invoiceId: params.invoiceId,
        academyId: invoice.studentProfile.user.academyId,
        submittedByUserId: session.user.id,
        amount: validated.data.amount,
        paymentMethod: validated.data.paymentMethod,
        transactionId: validated.data.transactionId || null,
        paymentDate: new Date(validated.data.paymentDate),
        note: validated.data.note || null,
        receiptUrl: normalizedReceiptUrl,
        status: "pending",
      },
    })

    try {
      await notifyManualPaymentSubmitted(submission.id)
    } catch (notificationError) {
      console.error("Failed to send manual payment submitted notifications:", notificationError)
    }

    return NextResponse.json({ submission }, { status: 201 })
  } catch (error) {
    console.error("Failed to submit payment:", error)
    return NextResponse.json(
      { error: "Failed to submit payment" },
      { status: 500 }
    )
  }
}
