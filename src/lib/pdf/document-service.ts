import { NextResponse } from "next/server"
import {
  readStoredDocumentFromUrl,
  storeDocument,
} from "@/lib/storage/document-storage"
import { prisma } from "@/lib/prisma"
import {
  fetchInvoicePDFData,
  generateInvoicePDFBuffer,
  getInvoicePDFFilename,
} from "@/lib/pdf/invoice-pdf"
import {
  fetchPayrollSlipData,
  generatePayrollSlipPDFBuffer,
  getPayrollSlipPDFFilename,
} from "@/lib/pdf/payroll-slip-pdf"
import {
  fetchReportData,
  generateReportPDFBuffer,
  getReportPDFFilename,
} from "@/lib/pdf/report-pdf"

export interface StoredPdfDocument {
  buffer: Buffer
  fileName: string
  filePath: string
  fileUrl: string
}

function getMimeTypeForFileName(fileName: string) {
  const normalized = fileName.toLowerCase()

  if (normalized.endsWith(".png")) {
    return "image/png"
  }

  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg"
  }

  if (normalized.endsWith(".webp")) {
    return "image/webp"
  }

  if (normalized.endsWith(".pdf")) {
    return "application/pdf"
  }

  return "application/octet-stream"
}

export function buildStoredFileResponse(
  buffer: Buffer,
  fileName: string,
  disposition: "inline" | "attachment" = "attachment"
) {
  const contentType = getMimeTypeForFileName(fileName)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": buffer.length.toString(),
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  })
}

export function buildPdfFileResponse(
  buffer: Buffer,
  fileName: string,
  disposition: "inline" | "attachment" = "attachment"
) {
  return buildStoredFileResponse(buffer, fileName, disposition)
}

export async function ensureStoredReportPdf(reportId: string) {
  const existing = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      pdfUrl: true,
    },
  })

  if (!existing) {
    return null
  }

  if (existing.pdfUrl) {
    const storedDocument = await readStoredDocumentFromUrl(existing.pdfUrl)

    if (storedDocument) {
      return storedDocument
    }
  }

  const data = await fetchReportData(reportId)

  if (!data) {
    return null
  }

  const buffer = await generateReportPDFBuffer(data)
  const storageResult = await storeDocument(
    buffer,
    getReportPDFFilename(data.report)
  )

  if (!storageResult.success) {
    throw new Error(storageResult.error || "Failed to store report PDF")
  }

  await prisma.report.update({
    where: { id: reportId },
    data: {
      pdfUrl: storageResult.fileUrl,
    },
  })

  return {
    buffer,
    fileName: storageResult.fileName,
    filePath: storageResult.filePath,
    fileUrl: storageResult.fileUrl,
  }
}

export async function ensureStoredInvoicePdf(invoiceId: string) {
  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      pdfUrl: true,
    },
  })

  if (!existing) {
    return null
  }

  if (existing.pdfUrl) {
    const storedDocument = await readStoredDocumentFromUrl(existing.pdfUrl)

    if (storedDocument) {
      return storedDocument
    }
  }

  const data = await fetchInvoicePDFData(invoiceId)

  if (!data) {
    return null
  }

  const buffer = await generateInvoicePDFBuffer(data)
  const storageResult = await storeDocument(
    buffer,
    getInvoicePDFFilename(data.invoice)
  )

  if (!storageResult.success) {
    throw new Error(storageResult.error || "Failed to store invoice PDF")
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      pdfUrl: storageResult.fileUrl,
    },
  })

  return {
    buffer,
    fileName: storageResult.fileName,
    filePath: storageResult.filePath,
    fileUrl: storageResult.fileUrl,
  }
}

export async function ensureStoredPayrollSlipPdf(recordId: string) {
  const existing = await prisma.payrollRecord.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      salarySlipUrl: true,
    },
  })

  if (!existing) {
    return null
  }

  if (existing.salarySlipUrl) {
    const storedDocument = await readStoredDocumentFromUrl(existing.salarySlipUrl)

    if (storedDocument) {
      return storedDocument
    }
  }

  const data = await fetchPayrollSlipData(recordId)

  if (!data) {
    return null
  }

  const buffer = await generatePayrollSlipPDFBuffer(data)
  const storageResult = await storeDocument(
    buffer,
    getPayrollSlipPDFFilename(data.record)
  )

  if (!storageResult.success) {
    throw new Error(storageResult.error || "Failed to store payroll salary slip PDF")
  }

  await prisma.payrollRecord.update({
    where: { id: recordId },
    data: {
      salarySlipUrl: storageResult.fileUrl,
    },
  })

  return {
    buffer,
    fileName: storageResult.fileName,
    filePath: storageResult.filePath,
    fileUrl: storageResult.fileUrl,
  }
}
