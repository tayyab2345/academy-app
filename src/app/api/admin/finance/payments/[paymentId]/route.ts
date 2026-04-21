import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateInvoiceStatus } from "@/lib/invoice-utils"

const updatePaymentSchema = z.object({
  status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
  notes: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: params.paymentId,
        invoice: {
          studentProfile: {
            user: {
              academyId: session.user.academyId,
            },
          },
        },
      },
      include: {
        invoice: {
          include: {
            studentProfile: {
              include: {
                user: true,
              },
            },
          },
        },
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json({ payment })
  } catch (error) {
    console.error("Failed to fetch payment:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = updatePaymentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        id: params.paymentId,
        invoice: {
          studentProfile: {
            user: {
              academyId: session.user.academyId,
            },
          },
        },
      },
      include: {
        invoice: {
          include: {
            payments: true,
            adjustments: true,
          },
        },
      },
    })

    if (!existingPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const payment = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          status: validated.data.status,
          notes: validated.data.notes,
        },
      })

      if (validated.data.status) {
        const invoice = existingPayment.invoice
        const completedPayments = invoice.payments.filter((paymentRecord) =>
          paymentRecord.id === params.paymentId
            ? validated.data.status === "completed"
            : paymentRecord.status === "completed"
        )

        const totalPaid = completedPayments.reduce(
          (sum, paymentRecord) => sum + Number(paymentRecord.amount),
          0
        )
        const adjustmentTotal = invoice.adjustments.reduce((sum, adjustment) => {
          if (adjustment.type === "surcharge") {
            return sum + Number(adjustment.amount)
          }

          return sum - Number(adjustment.amount)
        }, 0)
        const adjustedTotal = Number(invoice.totalAmount) + adjustmentTotal
        const newStatus = calculateInvoiceStatus(
          adjustedTotal,
          totalPaid,
          invoice.dueDate,
          invoice.status
        )

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: newStatus,
            paidAt: newStatus === "paid" ? invoice.paidAt ?? new Date() : null,
          },
        })
      }

      return updatedPayment
    })

    return NextResponse.json({ payment })
  } catch (error) {
    console.error("Failed to update payment:", error)
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    )
  }
}
