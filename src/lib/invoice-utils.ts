import { InvoiceStatus, PaymentStatus } from "@prisma/client"

export function generateInvoiceNumber(prefix: string = "INV"): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")

  return `${prefix}-${year}${month}-${random}`
}

export function calculateInvoiceStatus(
  totalAmount: number,
  paidAmount: number,
  dueDate: Date,
  currentStatus?: InvoiceStatus
): InvoiceStatus {
  if (currentStatus === "waived") {
    return "waived"
  }

  if (currentStatus === "draft") {
    return "draft"
  }

  const now = new Date()
  const isOverdue = now > dueDate

  if (paidAmount >= totalAmount) {
    return "paid"
  }

  if (paidAmount > 0 && paidAmount < totalAmount) {
    return "partial"
  }

  if (paidAmount === 0 && isOverdue) {
    return "overdue"
  }

  if (paidAmount === 0 && !isOverdue) {
    return "sent"
  }

  return "sent"
}

export function calculateOutstandingAmount(
  totalAmount: number,
  paidAmount: number,
  adjustments: Array<{ type: string; amount: number }> = []
): number {
  const adjustmentTotal = adjustments.reduce((sum, adjustment) => {
    if (adjustment.type === "surcharge") {
      return sum + adjustment.amount
    }

    return sum - adjustment.amount
  }, 0)

  const adjustedTotal = totalAmount + adjustmentTotal
  return Math.max(0, adjustedTotal - paidAmount)
}

export function shouldInvoiceBeOverdue(
  dueDate: Date,
  status: InvoiceStatus,
  paidAmount: number,
  totalAmount: number
): boolean {
  if (status === "paid" || status === "waived" || status === "draft") {
    return false
  }

  if (paidAmount >= totalAmount) {
    return false
  }

  return new Date() > dueDate
}

export function getNextDueDate(
  frequency: string,
  baseDate: Date = new Date(),
  dueDayOfMonth?: number | null
): Date {
  const next = new Date(baseDate)

  switch (frequency) {
    case "one_time":
      return baseDate
    case "monthly":
      next.setMonth(next.getMonth() + 1)
      if (dueDayOfMonth) {
        next.setDate(
          Math.min(
            dueDayOfMonth,
            new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
          )
        )
      }
      break
    case "term":
      next.setMonth(next.getMonth() + 3)
      break
    case "yearly":
      next.setFullYear(next.getFullYear() + 1)
      break
  }

  return next
}

export function calculateLateFee(
  baseAmount: number,
  lateFeeAmount: number | null | undefined,
  lateFeeType: string | null | undefined
): number {
  if (!lateFeeAmount || !lateFeeType) {
    return 0
  }

  if (lateFeeType === "fixed") {
    return lateFeeAmount
  }

  if (lateFeeType === "percentage") {
    return (baseAmount * lateFeeAmount) / 100
  }

  return 0
}

export interface PaymentSummary {
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  totalOverdue: number
  invoiceCount: number
  paidCount: number
  overdueCount: number
  partialCount: number
}

export function calculatePaymentSummary(
  invoices: Array<{
    totalAmount: number
    status: InvoiceStatus
    payments: Array<{ amount: number; status: PaymentStatus }>
    dueDate: Date
  }>
): PaymentSummary {
  let totalInvoiced = 0
  let totalPaid = 0
  let totalOutstanding = 0
  let totalOverdue = 0
  let paidCount = 0
  let overdueCount = 0
  let partialCount = 0

  const now = new Date()

  invoices.forEach((invoice) => {
    totalInvoiced += invoice.totalAmount

    const paidAmount = invoice.payments
      .filter((payment) => payment.status === "completed")
      .reduce((sum, payment) => sum + payment.amount, 0)

    totalPaid += paidAmount

    const outstanding = invoice.totalAmount - paidAmount
    totalOutstanding += outstanding

    if (invoice.status === "paid") {
      paidCount++
    } else if (invoice.status === "partial") {
      partialCount++
    } else if (invoice.dueDate < now && invoice.status !== "waived") {
      overdueCount++
      totalOverdue += outstanding
    }
  })

  return {
    totalInvoiced,
    totalPaid,
    totalOutstanding,
    totalOverdue,
    invoiceCount: invoices.length,
    paidCount,
    overdueCount,
    partialCount,
  }
}
