import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react"
import { authOptions } from "@/lib/auth"
import { calculateOutstandingAmount } from "@/lib/invoice-utils"
import { prisma } from "@/lib/prisma"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { FinanceActivityFeed } from "@/components/finance/finance-activity-feed"
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge"
import { PaymentSubmissionStatusBadge } from "@/components/finance/payment-submission-status-badge"

export const metadata: Metadata = {
  title: "Finance - Student - AcademyFlow",
  description: "View your invoices and payment history",
}

function buildCurrencyTotals(rows: Array<{ currency: string; amount: number }>) {
  const totals = new Map<string, number>()

  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) || 0) + row.amount)
  }

  return Array.from(totals.entries()).map(([currency, amount]) => ({
    currency,
    amount,
  }))
}

function renderCurrencyTotals(
  totals: Array<{
    currency: string
    amount: number
  }>
) {
  if (totals.length === 0) {
    return <span className="text-2xl font-bold">0</span>
  }

  if (totals.length === 1) {
    const [total] = totals
    return (
      <CurrencyAmount
        amount={total.amount}
        currency={total.currency}
        className="text-2xl font-bold"
      />
    )
  }

  return (
    <div className="space-y-1">
      {totals.map((total) => (
        <div key={total.currency} className="text-sm font-semibold">
          <CurrencyAmount amount={total.amount} currency={total.currency} />
        </div>
      ))}
    </div>
  )
}

export default async function StudentFinancePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/login")
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!studentProfile) {
    redirect("/login")
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      studentProfileId: studentProfile.id,
      status: { not: "draft" },
    },
    include: {
      class: {
        include: {
          course: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
      payments: {
        where: { status: "completed" },
        include: {
          recordedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      adjustments: true,
      manualPaymentSubmissions: {
        where: {
          submittedByUserId: session.user.id,
        },
        include: {
          reviewedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  })

  const outstandingByCurrency = buildCurrencyTotals(
    invoices.flatMap((invoice) => {
      const paid = invoice.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      )
      const outstanding = calculateOutstandingAmount(
        Number(invoice.totalAmount),
        paid,
        invoice.adjustments.map((adjustment) => ({
          type: adjustment.type,
          amount: Number(adjustment.amount),
        }))
      )

      return outstanding > 0 ? [{ currency: invoice.currency, amount: outstanding }] : []
    })
  )

  const overdueInvoices = invoices.filter((invoice) => {
    const paid = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    )
    const outstanding = calculateOutstandingAmount(
      Number(invoice.totalAmount),
      paid,
      invoice.adjustments.map((adjustment) => ({
        type: adjustment.type,
        amount: Number(adjustment.amount),
      }))
    )

    return (
      outstanding > 0 &&
      invoice.status !== "waived" &&
      new Date(invoice.dueDate) < new Date()
    )
  })

  const pendingReviewCount = invoices.reduce((count, invoice) => {
    const latestSubmission = invoice.manualPaymentSubmissions[0]
    return count + (latestSubmission?.status === "pending" ? 1 : 0)
  }, 0)

  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid")

  const activityItems = [
    ...invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: "sent" as const,
      title: `Invoice ${invoice.invoiceNumber}`,
      description: invoice.description,
      occurredAt: (invoice.issuedAt || invoice.createdAt).toISOString(),
      href: `/student/finance/invoices/${invoice.id}`,
      badge: "Invoice",
    })),
    ...invoices.flatMap((invoice) =>
      invoice.payments.map((payment) => ({
        id: `payment-${payment.id}`,
        type: "payment" as const,
        title: `Payment recorded for ${invoice.invoiceNumber}`,
        description: `${invoice.currency} ${Number(payment.amount).toFixed(2)} recorded on this invoice.`,
        occurredAt: payment.paymentDate.toISOString(),
        href: `/student/finance/invoices/${invoice.id}`,
        badge: "Payment",
      }))
    ),
    ...invoices.flatMap((invoice) =>
      invoice.manualPaymentSubmissions.map((submission) => ({
        id: `submission-${submission.id}`,
        type:
          submission.status === "approved"
            ? ("approval" as const)
            : submission.status === "rejected"
              ? ("rejection" as const)
              : ("submission" as const),
        title:
          submission.status === "approved"
            ? `Payment approved for ${invoice.invoiceNumber}`
            : submission.status === "rejected"
              ? `Payment rejected for ${invoice.invoiceNumber}`
              : `Payment proof submitted for ${invoice.invoiceNumber}`,
        description:
          submission.status === "rejected" && submission.rejectionReason
            ? submission.rejectionReason
            : `${invoice.currency} ${Number(submission.amount).toFixed(2)} submitted for review.`,
        occurredAt:
          submission.reviewedAt?.toISOString() ||
          submission.createdAt.toISOString(),
        href: `/student/finance/invoices/${invoice.id}`,
        badge: submission.status,
      }))
    ),
  ]
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
    )
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Finance</h2>
        <p className="text-muted-foreground">
          Track your invoices, receipts, approvals, and payment history.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>{renderCurrencyTotals(outstandingByCurrency)}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueInvoices.length}</div>
            <p className="text-xs text-muted-foreground">Invoices past due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviewCount}</div>
            <p className="text-xs text-muted-foreground">Submitted proofs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidInvoices.length}</div>
            <p className="text-xs text-muted-foreground">Invoices settled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,1.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest billing updates</CardDescription>
          </CardHeader>
          <CardContent>
            <FinanceActivityFeed items={activityItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription>Your invoice history</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No invoices found
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => {
                  const paid = invoice.payments.reduce(
                    (sum, payment) => sum + Number(payment.amount),
                    0
                  )
                  const outstanding = calculateOutstandingAmount(
                    Number(invoice.totalAmount),
                    paid,
                    invoice.adjustments.map((adjustment) => ({
                      type: adjustment.type,
                      amount: Number(adjustment.amount),
                    }))
                  )
                  const latestSubmission = invoice.manualPaymentSubmissions[0] || null

                  return (
                    <Link
                      key={invoice.id}
                      href={`/student/finance/invoices/${invoice.id}`}
                      className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm">
                              {invoice.invoiceNumber}
                            </span>
                            <InvoiceStatusBadge status={invoice.status} />
                            {latestSubmission && (
                              <PaymentSubmissionStatusBadge
                                status={latestSubmission.status}
                              />
                            )}
                          </div>
                          <p className="mt-1 font-medium">{invoice.description}</p>
                          {invoice.class && (
                            <p className="text-sm text-muted-foreground">
                              {invoice.class.course.code} - {invoice.class.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <CurrencyAmount
                            amount={Number(invoice.totalAmount)}
                            currency={invoice.currency}
                            className="font-medium"
                          />
                          {outstanding > 0 && (
                            <p className="text-sm text-red-600">
                              <CurrencyAmount
                                amount={outstanding}
                                currency={invoice.currency}
                              />{" "}
                              due
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Due {new Date(invoice.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
