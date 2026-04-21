import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { sendPaymentReceivedWorkflow } from "@/lib/email/email-workflows"
import { notifyPaymentReceived } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"
import { calculateInvoiceStatus } from "@/lib/invoice-utils"

const recordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "online", "manual"]),
  transactionReference: z.string().optional(),
  paymentDate: z.string().or(z.date()).default(() => new Date()),
  notes: z.string().optional(),
})

export async function GET(
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
      select: { id: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const payments = await prisma.payment.findMany({
      where: {
        invoiceId: params.invoiceId,
      },
      include: {
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    })

    return NextResponse.json({ payments })
  } catch (error) {
    console.error("Failed to fetch payments:", error)
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = recordPaymentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
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
      include: {
        payments: {
          where: { status: "completed" },
        },
        adjustments: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (invoice.status === "waived") {
      return NextResponse.json(
        { error: "Cannot record payment for waived invoice" },
        { status: 400 }
      )
    }

    if (invoice.status === "draft") {
      return NextResponse.json(
        { error: "Cannot record payment for draft invoice. Send it first." },
        { status: 400 }
      )
    }

    const paidAmount = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    )
    const adjustmentTotal = invoice.adjustments.reduce((sum, adjustment) => {
      if (adjustment.type === "surcharge") {
        return sum + Number(adjustment.amount)
      }

      return sum - Number(adjustment.amount)
    }, 0)
    const adjustedTotal = Number(invoice.totalAmount) + adjustmentTotal
    const outstanding = adjustedTotal - paidAmount

    if (validated.data.amount > outstanding) {
      return NextResponse.json(
        {
          error: `Payment amount exceeds outstanding balance of ${outstanding.toFixed(2)}`,
        },
        { status: 400 }
      )
    }

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          invoiceId: params.invoiceId,
          amount: validated.data.amount,
          currency: invoice.currency,
          paymentMethod: validated.data.paymentMethod,
          transactionReference: validated.data.transactionReference || null,
          paymentDate: new Date(validated.data.paymentDate),
          notes: validated.data.notes || null,
          status: "completed",
          recordedByUserId: session.user.id,
        },
      })

      const allPayments = await tx.payment.findMany({
        where: {
          invoiceId: params.invoiceId,
          status: "completed",
        },
      })

      const totalPaid = allPayments.reduce(
        (sum, recordedPayment) => sum + Number(recordedPayment.amount),
        0
      )

      const newStatus = calculateInvoiceStatus(
        adjustedTotal,
        totalPaid,
        invoice.dueDate,
        invoice.status
      )

      await tx.invoice.update({
        where: { id: params.invoiceId },
        data: {
          status: newStatus,
          paidAt: newStatus === "paid" ? new Date() : null,
        },
      })

      return newPayment
    })

    try {
      await notifyPaymentReceived(payment.id)
    } catch (notificationError) {
      console.error("Failed to send payment notifications:", notificationError)
    }

    void sendPaymentReceivedWorkflow(payment.id).catch((workflowError) => {
      console.error("Failed to send payment received emails:", workflowError)
    })

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error("Failed to record payment:", error)
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    )
  }
}
