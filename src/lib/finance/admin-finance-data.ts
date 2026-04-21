import { Prisma } from "@prisma/client"
import { unstable_cache } from "next/cache"
import { calculateOutstandingAmount } from "@/lib/invoice-utils"
import { prisma } from "@/lib/prisma"

export interface FinanceSummaryData {
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  totalOverdue: number
  invoiceCount: number
  paidCount: number
  overdueCount: number
  partialCount: number
  pendingSubmissions: number
}

export interface FinanceSummaryByCurrencyData extends FinanceSummaryData {
  currency: string
}

export interface AdminFinanceSummaryPayload {
  summary: FinanceSummaryData
  summaryByCurrency: FinanceSummaryByCurrencyData[]
  overdueCount: number
}

export interface AdminFinanceRecentPaymentItem {
  id: string
  amount: number
  currency: string
  paymentMethod: string
  createdAt: string
  invoice: {
    id: string
    invoiceNumber: string
    currency: string
    studentProfile: {
      user: {
        firstName: string
        lastName: string
      }
    }
  }
}

export interface AdminFinanceRecentSubmissionItem {
  id: string
  amount: number
  status: string
  createdAt: string
  invoice: {
    id: string
    invoiceNumber: string
    currency: string
    studentProfile: {
      user: {
        firstName: string
        lastName: string
      }
    }
  }
  submittedBy: {
    firstName: string
    lastName: string
  }
}

export interface AdminFinanceOverdueInvoiceItem {
  id: string
  invoiceNumber: string
  description: string
  totalAmount: number
  currency: string
  dueDate: string
  status: string
  outstandingAmount: number
  studentProfile: {
    user: {
      firstName: string
      lastName: string
    }
    studentId: string
  }
}

export interface AdminFinanceDashboardData {
  summary: FinanceSummaryData
  summaryByCurrency: FinanceSummaryByCurrencyData[]
  overdueCount: number
  recentPayments: AdminFinanceRecentPaymentItem[]
  recentSubmissions: AdminFinanceRecentSubmissionItem[]
  overdueInvoices: AdminFinanceOverdueInvoiceItem[]
}

const emptySummary: FinanceSummaryData = {
  totalInvoiced: 0,
  totalPaid: 0,
  totalOutstanding: 0,
  totalOverdue: 0,
  invoiceCount: 0,
  paidCount: 0,
  overdueCount: 0,
  partialCount: 0,
  pendingSubmissions: 0,
}

function buildInvoiceScope(academyId: string): Prisma.InvoiceWhereInput {
  return {
    studentProfile: {
      user: {
        academyId,
      },
    },
  }
}

async function getAdminFinanceSummaryDataUncached(
  academyId: string
): Promise<AdminFinanceSummaryPayload> {
  const invoiceWhere = buildInvoiceScope(academyId)
  const now = new Date()

  const [invoices, pendingSubmissions] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      select: {
        currency: true,
        totalAmount: true,
        dueDate: true,
        status: true,
        payments: {
          where: {
            status: "completed",
          },
          select: {
            amount: true,
          },
        },
        adjustments: {
          select: {
            type: true,
            amount: true,
          },
        },
      },
    }),
    prisma.manualPaymentSubmission.findMany({
      where: {
        academyId,
        status: "pending",
      },
      select: {
        invoice: {
          select: {
            currency: true,
          },
        },
      },
    }),
  ])

  const summaryByCurrency = new Map<string, FinanceSummaryByCurrencyData>()

  for (const invoice of invoices) {
    const currencySummary =
      summaryByCurrency.get(invoice.currency) || {
        currency: invoice.currency,
        ...emptySummary,
      }

    currencySummary.totalInvoiced += Number(invoice.totalAmount)
    currencySummary.invoiceCount += 1

    const paidAmount = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    )

    currencySummary.totalPaid += paidAmount

    const outstandingAmount = calculateOutstandingAmount(
      Number(invoice.totalAmount),
      paidAmount,
      invoice.adjustments.map((adjustment) => ({
        type: adjustment.type,
        amount: Number(adjustment.amount),
      }))
    )

    if (outstandingAmount > 0) {
      currencySummary.totalOutstanding += outstandingAmount

      if (invoice.dueDate < now && invoice.status !== "waived") {
        currencySummary.totalOverdue += outstandingAmount
        currencySummary.overdueCount += 1
      }
    }

    if (invoice.status === "paid") {
      currencySummary.paidCount += 1
    } else if (invoice.status === "partial") {
      currencySummary.partialCount += 1
    }

    summaryByCurrency.set(invoice.currency, currencySummary)
  }

  for (const submission of pendingSubmissions) {
    const existingSummary =
      summaryByCurrency.get(submission.invoice.currency) || {
        currency: submission.invoice.currency,
        ...emptySummary,
      }

    existingSummary.pendingSubmissions += 1
    summaryByCurrency.set(submission.invoice.currency, existingSummary)
  }

  const summaries = Array.from(summaryByCurrency.values()).sort((left, right) =>
    left.currency.localeCompare(right.currency)
  )

  return {
    summary: summaries.reduce<FinanceSummaryData>(
      (totals, summary) => ({
        totalInvoiced: totals.totalInvoiced + summary.totalInvoiced,
        totalPaid: totals.totalPaid + summary.totalPaid,
        totalOutstanding: totals.totalOutstanding + summary.totalOutstanding,
        totalOverdue: totals.totalOverdue + summary.totalOverdue,
        invoiceCount: totals.invoiceCount + summary.invoiceCount,
        paidCount: totals.paidCount + summary.paidCount,
        overdueCount: totals.overdueCount + summary.overdueCount,
        partialCount: totals.partialCount + summary.partialCount,
        pendingSubmissions: totals.pendingSubmissions + summary.pendingSubmissions,
      }),
      { ...emptySummary }
    ),
    summaryByCurrency: summaries,
    overdueCount: summaries.reduce(
      (total, summary) => total + summary.overdueCount,
      0
    ),
  }
}

export async function getAdminFinanceSummaryData(academyId: string) {
  return unstable_cache(
    async () => getAdminFinanceSummaryDataUncached(academyId),
    ["admin-finance-summary", academyId],
    {
      revalidate: 60,
    }
  )()
}

export async function getAdminFinanceDashboardData(
  academyId: string
): Promise<AdminFinanceDashboardData> {
  const invoiceWhere = buildInvoiceScope(academyId)
  const now = new Date()

  const [summaryData, recentPayments, recentSubmissions, overdueInvoices] =
    await Promise.all([
      getAdminFinanceSummaryData(academyId),
      prisma.payment.findMany({
        where: {
          invoice: {
            studentProfile: {
              user: {
                academyId,
              },
            },
          },
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          paymentMethod: true,
          createdAt: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              currency: true,
              studentProfile: {
                select: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      }),
      prisma.manualPaymentSubmission.findMany({
        where: {
          academyId,
        },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              currency: true,
              studentProfile: {
                select: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          submittedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      }),
      prisma.invoice.findMany({
        where: {
          ...invoiceWhere,
          status: {
            in: ["sent", "partial", "overdue"],
          },
          dueDate: {
            lt: now,
          },
        },
        select: {
          id: true,
          invoiceNumber: true,
          description: true,
          totalAmount: true,
          currency: true,
          dueDate: true,
          status: true,
          studentProfile: {
            select: {
              studentId: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          payments: {
            where: {
              status: "completed",
            },
            select: {
              amount: true,
            },
          },
          adjustments: {
            select: {
              type: true,
              amount: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
        take: 5,
      }),
    ])

  return {
    summary: summaryData.summary,
    summaryByCurrency: summaryData.summaryByCurrency,
    overdueCount: summaryData.overdueCount,
    recentPayments: recentPayments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
      createdAt: payment.createdAt.toISOString(),
    })),
    recentSubmissions: recentSubmissions.map((submission) => ({
      ...submission,
      amount: Number(submission.amount),
      createdAt: submission.createdAt.toISOString(),
    })),
    overdueInvoices: overdueInvoices.map((invoice) => {
      const paidAmount = invoice.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      )

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        description: invoice.description,
        totalAmount: Number(invoice.totalAmount),
        currency: invoice.currency,
        dueDate: invoice.dueDate.toISOString(),
        status: invoice.status,
        outstandingAmount: calculateOutstandingAmount(
          Number(invoice.totalAmount),
          paidAmount,
          invoice.adjustments.map((adjustment) => ({
            type: adjustment.type,
            amount: Number(adjustment.amount),
          }))
        ),
        studentProfile: invoice.studentProfile,
      }
    }),
  }
}
