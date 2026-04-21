import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateInvoiceStatus } from "@/lib/invoice-utils"
import { isValidCurrency } from "@/lib/currency-utils"

const updateInvoiceSchema = z.object({
  invoiceCategory: z
    .enum([
      "tuition",
      "registration",
      "material",
      "transport",
      "activity",
      "other",
    ])
    .optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  taxAmount: z.number().min(0).optional(),
  currency: z.string().refine(isValidCurrency, "Invalid currency").optional(),
  dueDate: z.string().or(z.date()).optional(),
  notes: z.string().optional().nullable(),
  status: z
    .enum(["draft", "sent", "partial", "paid", "overdue", "waived"])
    .optional(),
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
      include: {
        studentProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        class: {
          include: {
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        feePlan: true,
        payments: {
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
        },
        adjustments: {
          include: {
            createdBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error("Failed to fetch invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = updateInvoiceSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const existingInvoice = await prisma.invoice.findFirst({
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

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const updateData: any = {
      invoiceCategory: validated.data.invoiceCategory,
      description: validated.data.description,
      amount: validated.data.amount,
      taxAmount: validated.data.taxAmount,
      currency: validated.data.currency,
      notes:
        validated.data.notes === undefined ? undefined : validated.data.notes,
      status: validated.data.status,
    }

    if (validated.data.dueDate) {
      updateData.dueDate = new Date(validated.data.dueDate)
    }

    if (
      validated.data.amount !== undefined ||
      validated.data.taxAmount !== undefined
    ) {
      const amount = validated.data.amount ?? Number(existingInvoice.amount)
      const taxAmount =
        validated.data.taxAmount ?? Number(existingInvoice.taxAmount)
      updateData.totalAmount = Number(amount) + Number(taxAmount)
    }

    let invoice = await prisma.invoice.update({
      where: { id: params.invoiceId },
      data: updateData,
    })

    if (
      validated.data.amount !== undefined ||
      validated.data.taxAmount !== undefined ||
      validated.data.dueDate !== undefined ||
      validated.data.status !== undefined
    ) {
      const paidAmount = existingInvoice.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      )
      const adjustmentTotal = existingInvoice.adjustments.reduce(
        (sum, adjustment) => {
          if (adjustment.type === "surcharge") {
            return sum + Number(adjustment.amount)
          }

          return sum - Number(adjustment.amount)
        },
        0
      )
      const adjustedTotal = Number(invoice.totalAmount) + adjustmentTotal
      const newStatus = calculateInvoiceStatus(
        adjustedTotal,
        paidAmount,
        invoice.dueDate,
        invoice.status
      )

      if (newStatus !== invoice.status) {
        invoice = await prisma.invoice.update({
          where: { id: params.invoiceId },
          data: {
            status: newStatus,
            paidAt: newStatus === "paid" ? invoice.paidAt ?? new Date() : null,
          },
        })
      }
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error("Failed to update invoice:", error)
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    )
  }
}
