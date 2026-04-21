import { readStoredDocumentFromUrl } from "@/lib/storage/document-storage"

export interface PDFGenerationOptions {
  landscape?: boolean
  format?: "A4" | "Letter" | "Legal"
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
}

export const defaultPDFOptions: PDFGenerationOptions = {
  landscape: false,
  format: "A4",
  margin: {
    top: "0.75in",
    right: "0.75in",
    bottom: "0.75in",
    left: "0.75in",
  },
}

export interface AcademyBranding {
  name: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor?: string | null
  contactEmail: string
  contactPhone?: string | null
  address?: string | null
}

function getMimeTypeForPdfImage(fileName: string) {
  const normalized = fileName.toLowerCase()

  if (normalized.endsWith(".png")) {
    return "image/png"
  }

  if (normalized.endsWith(".webp")) {
    return "image/webp"
  }

  return "image/jpeg"
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function formatDateForPDF(date: Date | string) {
  const value = new Date(date)
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatDateTimeForPDF(date: Date | string) {
  const value = new Date(date)
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatCurrencyForPDF(amount: number | string, currency: string) {
  const numericAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numericAmount)
}

export function sanitizeHtmlForPDF(html: string) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "")
    .replace(/javascript:/gi, "")
}

export function renderTextBlock(text?: string | null) {
  if (!text) {
    return ""
  }

  return escapeHtml(text).replace(/\n/g, "<br />")
}

export function buildPDFFilename(prefix: string, id: string, date?: Date) {
  const dateStr = (date || new Date()).toISOString().split("T")[0]
  return `${prefix}_${id}_${dateStr}.pdf`
}

export async function resolvePdfImageSource(imageUrl: string | null) {
  if (!imageUrl) {
    return null
  }

  try {
    const storedDocument = await readStoredDocumentFromUrl(imageUrl)

    if (!storedDocument) {
      return imageUrl
    }

    const mimeType = getMimeTypeForPdfImage(storedDocument.fileName)

    return `data:${mimeType};base64,${storedDocument.buffer.toString("base64")}`
  } catch (error) {
    console.error("Failed to embed stored PDF image:", error)
    return imageUrl
  }
}

export function renderAcademyHeader(branding: AcademyBranding) {
  return `
    <div style="display: flex; align-items: center; margin-bottom: 24px; border-bottom: 2px solid ${branding.primaryColor}; padding-bottom: 16px;">
      ${
        branding.logoUrl
          ? `
        <div style="margin-right: 16px;">
          <img src="${branding.logoUrl}" alt="${escapeHtml(branding.name)}" style="max-height: 60px; max-width: 150px;" />
        </div>
      `
          : ""
      }
      <div style="flex: 1;">
        <h1 style="margin: 0; color: ${branding.primaryColor}; font-size: 24px;">${escapeHtml(branding.name)}</h1>
        <p style="margin: 4px 0 0; color: #666; font-size: 12px;">
          ${escapeHtml(branding.contactEmail)}
          ${branding.contactPhone ? ` • ${escapeHtml(branding.contactPhone)}` : ""}
          ${branding.address ? `<br/>${escapeHtml(branding.address)}` : ""}
        </p>
      </div>
    </div>
  `
}

export function renderPDFFooter(branding: AcademyBranding) {
  return `
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af;">
      <p>${escapeHtml(branding.name)} • Generated on ${formatDateForPDF(new Date())}</p>
      <p>This is an official document from ${escapeHtml(branding.name)}</p>
    </div>
  `
}
