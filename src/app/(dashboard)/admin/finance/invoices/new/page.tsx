import { Metadata } from "next"
import { InvoiceForm } from "@/components/admin/finance/invoice-form"

export const metadata: Metadata = {
  title: "Create Invoice - Finance - AcademyFlow",
  description: "Create a new invoice",
}

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Invoice</h2>
        <p className="text-muted-foreground">
          Create a new invoice for a student
        </p>
      </div>

      <InvoiceForm />
    </div>
  )
}
