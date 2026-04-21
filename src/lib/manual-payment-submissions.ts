import { z } from "zod"
import {
  getDocumentUrlFromRelativePath,
  getRelativeDocumentPathFromUrl,
} from "@/lib/storage/document-storage"
import { manualSubmissionPaymentMethods } from "@/lib/manual-payment-utils"

const receiptPathPrefix = "/api/uploads/receipts/"
const documentPathPrefix = "/api/documents/"

function isSupportedReceiptUrl(value: string) {
  return (
    /^https?:\/\//i.test(value) ||
    value.startsWith(receiptPathPrefix) ||
    value.startsWith(documentPathPrefix)
  )
}

export const manualPaymentSubmissionInputSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.enum(manualSubmissionPaymentMethods),
  transactionId: z.string().trim().optional(),
  paymentDate: z.string().or(z.date()),
  note: z.string().trim().optional(),
  receiptUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || isSupportedReceiptUrl(value),
      "Receipt URL must be a valid upload or document URL"
    ),
})

export function normalizeReceiptUrl(receiptUrl?: string | null) {
  if (!receiptUrl) {
    return null
  }

  let relativePath = getRelativeDocumentPathFromUrl(receiptUrl)

  if (!relativePath) {
    const pathname = /^https?:\/\//i.test(receiptUrl)
      ? new URL(receiptUrl).pathname
      : receiptUrl

    if (pathname.startsWith(receiptPathPrefix)) {
      relativePath = pathname.slice(receiptPathPrefix.length).replace(/^\/+/, "")
    }
  }

  if (!relativePath) {
    return null
  }

  return getDocumentUrlFromRelativePath(relativePath)
}

export function getReceiptAccessUrl(fileUrl: string) {
  const relativePath = getRelativeDocumentPathFromUrl(fileUrl)

  if (!relativePath) {
    return fileUrl
  }

  return `${receiptPathPrefix}${relativePath}`
}
