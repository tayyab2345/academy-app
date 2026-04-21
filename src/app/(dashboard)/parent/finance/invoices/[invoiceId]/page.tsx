import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { ArrowLeft, BookOpen, Calendar, User } from "lucide-react"
import { PaymentMethod } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { calculateOutstandingAmount } from "@/lib/invoice-utils"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge"
import { InvoiceTimeline, InvoiceTimelineEvent } from "@/components/finance/invoice-timeline"
import { OutstandingBalanceCard } from "@/components/finance/outstanding-balance-card"
import { PaymentHistoryTable } from "@/components/finance/payment-history-table"
import { PaymentInstructionsCard } from "@/components/finance/payment-instructions-card"
import { PaymentSubmissionStatusSection } from "@/components/finance/payment-submission-status-section"

interface InvoiceDetailPageProps {
  params: {
    invoiceId: string
  }
}

async function fetchInvoiceForParent(invoiceId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "parent") {
    return null
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!parentProfile) {
    return null
  }

  const links = await prisma.parentStudentLink.findMany({
    where: { parentProfileId: parentProfile.id },
    select: { studentProfileId: true },
  })

  return prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      studentProfileId: { in: links.map((link) => link.studentProfileId) },
      status: { not: "draft" },
    },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              academyId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
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
        orderBy: {
          paymentDate: "desc",
        },
      },
      adjustments: true,
      manualPaymentSubmissions: {
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
  })
}

export async function generateMetadata({
  params,
}: InvoiceDetailPageProps): Promise<Metadata> {
  const invoice = await fetchInvoiceForParent(params.invoiceId)

  if (!invoice) {
    return { title: "Invoice Not Found" }
  }

  return {
    title: `${invoice.invoiceNumber} - Finance - AcademyFlow`,
  }
}

export default async function ParentInvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "parent") {
    redirect("/login")
  }

  const invoice = await fetchInvoiceForParent(params.invoiceId)

  if (!invoice) {
    notFound()
  }

  const paymentSettings = await prisma.academyPaymentSettings.findUnique({
    where: { academyId: session.user.academyId },
  })

  const paidAmount = invoice.payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  )
  const outstanding = calculateOutstandingAmount(
    Number(invoice.totalAmount),
    paidAmount,
    invoice.adjustments.map((adjustment) => ({
      type: adjustment.type,
      amount: Number(adjustment.amount),
    }))
  )
  const adjustedTotal =
    Number(invoice.totalAmount) +
    invoice.adjustments.reduce((sum, adjustment) => {
      if (adjustment.type === "surcharge") {
        return sum + Number(adjustment.amount)
      }

      return sum - Number(adjustment.amount)
    }, 0)

  const ownSubmissions = invoice.manualPaymentSubmissions.filter(
    (submission) => submission.submittedByUserId === session.user.id
  )
  const latestOwnSubmission = ownSubmissions[0] || null
  const hasPendingSubmissionForInvoice = invoice.manualPaymentSubmissions.some(
    (submission) => submission.status === "pending"
  )

  const timelineEvents: InvoiceTimelineEvent[] = [
    {
      id: `created-${invoice.id}`,
      type: "created",
      date: invoice.createdAt.toISOString(),
      actor: { name: "Academy", role: "admin" },
      note: invoice.description,
    },
  ]

  if (invoice.status !== "draft") {
    timelineEvents.push({
      id: `sent-${invoice.id}`,
      type: "sent",
      date: (invoice.issuedAt || invoice.createdAt).toISOString(),
      actor: { name: "Academy", role: "admin" },
    })
  }

  for (const submission of ownSubmissions) {
    timelineEvents.push({
      id: `submitted-${submission.id}`,
      type: "submitted",
      date: submission.createdAt.toISOString(),
      actor: { name: "You", role: "parent" },
      amount: Number(submission.amount),
      currency: invoice.currency,
    })

    if (submission.status === "approved") {
      timelineEvents.push({
        id: `approved-${submission.id}`,
        type: "approved",
        date: (submission.reviewedAt || submission.createdAt).toISOString(),
        actor: submission.reviewedBy
          ? {
              name: `${submission.reviewedBy.firstName} ${submission.reviewedBy.lastName}`,
              role: "admin",
            }
          : undefined,
      })
    }

    if (submission.status === "rejected") {
      timelineEvents.push({
        id: `rejected-${submission.id}`,
        type: "rejected",
        date: (submission.reviewedAt || submission.createdAt).toISOString(),
        actor: submission.reviewedBy
          ? {
              name: `${submission.reviewedBy.firstName} ${submission.reviewedBy.lastName}`,
              role: "admin",
            }
          : undefined,
        rejectionReason: submission.rejectionReason || undefined,
      })
    }
  }

  for (const payment of invoice.payments) {
    timelineEvents.push({
      id: `payment-${payment.id}`,
      type:
        Number(payment.amount) >= adjustedTotal ? "paid" : "partial",
      date: payment.paymentDate.toISOString(),
      actor: payment.recordedBy
        ? {
            name: `${payment.recordedBy.firstName} ${payment.recordedBy.lastName}`,
            role: "admin",
          }
        : undefined,
      amount: Number(payment.amount),
      currency: payment.currency,
    })
  }

  timelineEvents.sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parent/finance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-2xl font-bold tracking-tight">
              {invoice.invoiceNumber}
            </h2>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-muted-foreground">
            Issued on {new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Description
                </p>
                <p className="text-lg">{invoice.description}</p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {invoice.invoiceCategory}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4" />
                    Student
                  </p>
                  <p className="font-medium">
                    {invoice.studentProfile.user.firstName}{" "}
                    {invoice.studentProfile.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.studentProfile.studentId}
                  </p>
                </div>
                {invoice.class && (
                  <div>
                    <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      Class
                    </p>
                    <p className="font-medium">{invoice.class.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.class.course.code} - {invoice.class.course.name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Issue Date
                  </p>
                  <p>{new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </p>
                  <p
                    className={
                      outstanding > 0 && new Date(invoice.dueDate) < new Date()
                        ? "font-medium text-red-600"
                        : ""
                    }
                  >
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentHistoryTable
                  payments={invoice.payments.map((payment) => ({
                    id: payment.id,
                    amount: Number(payment.amount),
                    currency: payment.currency,
                    paymentMethod: payment.paymentMethod as PaymentMethod,
                    transactionReference: payment.transactionReference,
                    paymentDate: payment.paymentDate.toISOString(),
                    status: payment.status,
                    recordedBy: payment.recordedBy,
                  }))}
                  fallbackCurrency={invoice.currency}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Invoice Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceTimeline events={timelineEvents} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <OutstandingBalanceCard
            totalAmount={adjustedTotal}
            paidAmount={paidAmount}
            currency={invoice.currency}
            dueDate={invoice.dueDate.toISOString()}
            status={invoice.status}
            pendingSubmission={hasPendingSubmissionForInvoice}
          />

          <Card>
            <CardHeader>
              <CardTitle>Billing Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <CurrencyAmount amount={Number(invoice.amount)} currency={invoice.currency} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tax</span>
                <CurrencyAmount
                  amount={Number(invoice.taxAmount)}
                  currency={invoice.currency}
                />
              </div>
              {invoice.adjustments.length > 0 && (
                <>
                  <Separator />
                  {invoice.adjustments.map((adjustment) => (
                    <div
                      key={adjustment.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-muted-foreground">
                        {adjustment.label}
                      </span>
                      <CurrencyAmount
                        amount={
                          adjustment.type === "surcharge"
                            ? Number(adjustment.amount)
                            : -Number(adjustment.amount)
                        }
                        currency={invoice.currency}
                        className={
                          adjustment.type === "surcharge"
                            ? "text-red-600"
                            : "text-green-600"
                        }
                      />
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {outstanding > 0 &&
            invoice.status !== "paid" &&
            invoice.status !== "waived" && (
              <div className="space-y-6">
                <PaymentInstructionsCard settings={paymentSettings} />
                <PaymentSubmissionStatusSection
                  invoiceId={invoice.id}
                  invoiceNumber={invoice.invoiceNumber}
                  currency={invoice.currency}
                  outstandingAmount={outstanding}
                  userRole="parent"
                  submission={
                    latestOwnSubmission
                      ? {
                          id: latestOwnSubmission.id,
                          amount: Number(latestOwnSubmission.amount),
                          paymentMethod: latestOwnSubmission.paymentMethod,
                          transactionId: latestOwnSubmission.transactionId,
                          paymentDate: latestOwnSubmission.paymentDate.toISOString(),
                          status: latestOwnSubmission.status,
                          rejectionReason: latestOwnSubmission.rejectionReason,
                          reviewedBy: latestOwnSubmission.reviewedBy,
                          reviewedAt:
                            latestOwnSubmission.reviewedAt?.toISOString() || null,
                          createdAt: latestOwnSubmission.createdAt.toISOString(),
                        }
                      : null
                  }
                  hasPendingSubmissionForInvoice={hasPendingSubmissionForInvoice}
                />
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
