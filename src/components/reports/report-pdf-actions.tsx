"use client"

import { Download } from "lucide-react"
import { DocumentActionButton } from "@/components/ui/document-action-button"

interface ReportPdfActionsProps {
  reportId: string
  pdfUrl?: string | null
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  showLabel?: boolean
}

export function ReportPdfActions({
  reportId,
  pdfUrl,
  variant = "outline",
  size = "sm",
  showLabel = true,
}: ReportPdfActionsProps) {
  return (
    <DocumentActionButton
      variant={variant}
      size={size}
      icon={<Download className="h-4 w-4" />}
      label={showLabel ? "Download PDF" : ""}
      generateUrl={`/api/reports/${reportId}/generate-pdf`}
      downloadUrl={`/api/reports/${reportId}/download`}
      aria-label={showLabel ? undefined : "Download report PDF"}
    />
  )
}
