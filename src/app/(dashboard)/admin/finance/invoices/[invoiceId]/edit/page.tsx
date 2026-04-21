import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { InvoiceForm } from "@/components/admin/finance/invoice-form"

interface EditInvoicePageProps {
  params: {
    invoiceId: string
  }
}

async function fetchInvoice(invoiceId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      studentProfile: {
        user: {
          academyId: session.user.academyId,
        },
      },
    },
  })

  return invoice
}

export async function generateMetadata({
  params,
}: EditInvoicePageProps): Promise<Metadata> {
  const invoice = await fetchInvoice(params.invoiceId)

  if (!invoice) {
    return { title: "Invoice Not Found" }
  }

  return {
    title: `Edit ${invoice.invoiceNumber} - Invoices - AcademyFlow`,
  }
}

export default async function EditInvoicePage({
  params,
}: EditInvoicePageProps) {
  const invoice = await fetchInvoice(params.invoiceId)

  if (!invoice) {
    notFound()
  }

  const initialData = {
    id: invoice.id,
    studentProfileId: invoice.studentProfileId,
    classId: invoice.classId,
    feePlanId: invoice.feePlanId,
    invoiceCategory: invoice.invoiceCategory,
    description: invoice.description,
    amount: Number(invoice.amount),
    taxAmount: Number(invoice.taxAmount),
    currency: invoice.currency,
    dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
    notes: invoice.notes || "",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/finance/invoices/${params.invoiceId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Invoice</h2>
          <p className="text-muted-foreground">
            Update invoice details for {invoice.invoiceNumber}
          </p>
        </div>
      </div>

      <InvoiceForm initialData={initialData} isEditing />
    </div>
  )
}
