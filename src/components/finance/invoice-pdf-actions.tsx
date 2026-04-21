"use client"

import { Download } from "lucide-react"
import { DocumentActionButton } from "@/components/ui/document-action-button"

interface InvoicePdfActionsProps {
  invoiceId: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  showLabel?: boolean
}

export function InvoicePdfActions({
  invoiceId,
  variant = "outline",
  size = "sm",
  showLabel = true,
}: InvoicePdfActionsProps) {
  return (
    <DocumentActionButton
      variant={variant}
      size={size}
      icon={<Download className="h-4 w-4" />}
      label={showLabel ? "Download PDF" : ""}
      generateUrl={`/api/admin/finance/invoices/${invoiceId}/generate-pdf`}
      downloadUrl={`/api/admin/finance/invoices/${invoiceId}/download`}
      aria-label={showLabel ? undefined : "Download invoice PDF"}
    />
  )
}
