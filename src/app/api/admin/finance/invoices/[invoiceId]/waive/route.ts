import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const waiveInvoiceSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
})

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
    const validated = waiveInvoiceSchema.safeParse(body)

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
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Cannot waive a paid invoice" },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoiceAdjustment.create({
        data: {
          invoiceId: params.invoiceId,
          type: "waiver",
          label: "Invoice Waived",
          amount: Number(invoice.totalAmount),
          notes: validated.data.reason,
          createdByUserId: session.user.id,
        },
      })

      await tx.invoice.update({
        where: { id: params.invoiceId },
        data: {
          status: "waived",
          paidAt: null,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to waive invoice:", error)
    return NextResponse.json(
      { error: "Failed to waive invoice" },
      { status: 500 }
    )
  }
}
