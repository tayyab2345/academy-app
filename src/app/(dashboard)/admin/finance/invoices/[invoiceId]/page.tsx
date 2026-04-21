import { Metadata } from "next"
import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Clock,
  Pencil,
  Plus,
  Send,
} from "lucide-react"
import { authOptions } from "@/lib/auth"
import { sendInvoiceSentWorkflow } from "@/lib/email/email-workflows"
import { calculateInvoiceStatus, calculateOutstandingAmount } from "@/lib/invoice-utils"
import { notifyInvoiceSent } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge"
import { InvoicePdfActions } from "@/components/finance/invoice-pdf-actions"
import { InvoiceTimeline, InvoiceTimelineEvent } from "@/components/finance/invoice-timeline"
import { ManualPaymentSummaryCard } from "@/components/finance/manual-payment-summary-card"
import { OutstandingBalanceCard } from "@/components/finance/outstanding-balance-card"
import { PaymentHistoryTable } from "@/components/finance/payment-history-table"
import { RecordPaymentDialog } from "@/components/admin/finance/record-payment-dialog"

interface InvoiceDetailPageProps {
  params: {
    invoiceId: string
  }
}

async function fetchInvoice(invoiceId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  return prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      studentProfile: {
        user: {
          academyId: session.user.academyId,
        },
      },
    },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          parentLinks: {
            include: {
              parentProfile: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
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
      feePlan: true,
      payments: {
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
      adjustments: {
        include: {
          createdBy: {
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
      manualPaymentSubmissions: {
        include: {
          submittedBy: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
            },
          },
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
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })
}

export async function generateMetadata({
  params,
}: InvoiceDetailPageProps): Promise<Metadata> {
  const invoice = await fetchInvoice(params.invoiceId)

  if (!invoice) {
    return { title: "Invoice Not Found" }
  }

  return {
    title: `${invoice.invoiceNumber} - Invoices - AcademyFlow`,
  }
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const invoice = await fetchInvoice(params.invoiceId)

  if (!invoice) {
    notFound()
  }

  const paidAmount = invoice.payments
    .filter((payment) => payment.status === "completed")
    .reduce((sum, payment) => sum + Number(payment.amount), 0)

  const adjustmentTotal = invoice.adjustments.reduce((sum, adjustment) => {
    if (adjustment.type === "surcharge") {
      return sum + Number(adjustment.amount)
    }

    return sum - Number(adjustment.amount)
  }, 0)

  const adjustedTotal = Number(invoice.totalAmount) + adjustmentTotal
  const outstanding = calculateOutstandingAmount(
    Number(invoice.totalAmount),
    paidAmount,
    invoice.adjustments.map((adjustment) => ({
      type: adjustment.type,
      amount: Number(adjustment.amount),
    }))
  )

  const canEdit = invoice.status !== "paid" && invoice.status !== "waived"
  const canSend = invoice.status === "draft"
  const canRecordPayment =
    invoice.status !== "draft" && invoice.status !== "waived" && outstanding > 0
  const canWaive = invoice.status !== "paid" && invoice.status !== "waived"
  const pendingSubmissionCount = invoice.manualPaymentSubmissions.filter(
    (submission) => submission.status === "pending"
  ).length

  const timelineEvents: InvoiceTimelineEvent[] = [
    {
      id: `created-${invoice.id}`,
      type: "created",
      date: invoice.createdAt.toISOString(),
      actor: {
        name: `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}`,
        role: "admin",
      },
      note: invoice.description,
    },
  ]

  if (invoice.status !== "draft") {
    timelineEvents.push({
      id: `sent-${invoice.id}`,
      type: "sent",
      date: (invoice.issuedAt || invoice.createdAt).toISOString(),
      actor: {
        name: `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}`,
        role: "admin",
      },
    })
  }

  for (const submission of invoice.manualPaymentSubmissions) {
    timelineEvents.push({
      id: `submitted-${submission.id}`,
      type: "submitted",
      date: submission.createdAt.toISOString(),
      actor: {
        name: `${submission.submittedBy.firstName} ${submission.submittedBy.lastName}`,
        role: submission.submittedBy.role,
      },
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

  for (const payment of invoice.payments.filter((item) => item.status === "completed")) {
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

  async function sendInvoiceAction() {
    "use server"

    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: params.invoiceId,
        status: "draft",
        studentProfile: {
          user: {
            academyId: session.user.academyId,
          },
        },
      },
      select: { id: true },
    })

    if (!existingInvoice) {
      return
    }

    await prisma.invoice.update({
      where: { id: params.invoiceId },
      data: {
        status: "sent",
        issuedAt: new Date(),
      },
    })

    try {
      await notifyInvoiceSent(params.invoiceId)
    } catch (notificationError) {
      console.error("Failed to send invoice notifications/emails:", notificationError)
    }

    void sendInvoiceSentWorkflow(params.invoiceId).catch((workflowError) => {
      console.error("Failed to send invoice emails:", workflowError)
    })

    revalidatePath("/admin/finance")
    revalidatePath("/admin/finance/invoices")
    revalidatePath(`/admin/finance/invoices/${params.invoiceId}`)
  }

  async function waiveInvoiceAction() {
    "use server"

    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: params.invoiceId,
        studentProfile: {
          user: {
            academyId: session.user.academyId,
          },
        },
      },
      select: {
        id: true,
        totalAmount: true,
        status: true,
      },
    })

    if (
      !existingInvoice ||
      existingInvoice.status === "paid" ||
      existingInvoice.status === "waived"
    ) {
      return
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoiceAdjustment.create({
        data: {
          invoiceId: params.invoiceId,
          type: "waiver",
          label: "Invoice Waived",
          amount: Number(existingInvoice.totalAmount),
          notes: "Manually waived by admin",
          createdByUserId: session.user.id,
        },
      })

      await tx.invoice.update({
        where: { id: params.invoiceId },
        data: {
          status: "waived",
          paidAt: null,
        },
      })
    })

    revalidatePath("/admin/finance")
    revalidatePath("/admin/finance/invoices")
    revalidatePath(`/admin/finance/invoices/${params.invoiceId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/finance/invoices">
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
              {pendingSubmissionCount > 0 && (
                <Badge variant="warning">
                  {pendingSubmissionCount} pending submission
                  {pendingSubmissionCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Created on {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Link href={`/admin/finance/invoices/${params.invoiceId}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          {canSend && (
            <form action={sendInvoiceAction}>
              <Button type="submit">
                <Send className="mr-2 h-4 w-4" />
                Send Invoice
              </Button>
            </form>
          )}
          {canRecordPayment && (
            <RecordPaymentDialog
              invoiceId={params.invoiceId}
              invoiceNumber={invoice.invoiceNumber}
              currency={invoice.currency}
              outstandingAmount={outstanding}
              triggerLabel="Record Payment"
            />
          )}
          <InvoicePdfActions invoiceId={params.invoiceId} />
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
                  <p className="text-sm font-medium text-muted-foreground">
                    Student
                  </p>
                  <p className="font-medium">
                    {invoice.studentProfile.user.firstName}{" "}
                    {invoice.studentProfile.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.studentProfile.studentId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.studentProfile.user.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Class
                  </p>
                  {invoice.class ? (
                    <>
                      <p className="font-medium">{invoice.class.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.class.course.code} - {invoice.class.course.name}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Not class-specific</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Issue Date
                  </p>
                  <p>
                    {new Date(
                      invoice.issuedAt || invoice.createdAt
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
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

          {invoice.manualPaymentSubmissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Manual Payment Submissions</CardTitle>
                <CardDescription>
                  Submitted proofs attached to this invoice.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoice.manualPaymentSubmissions.map((submission) => (
                  <div key={submission.id} className="space-y-3">
                    <ManualPaymentSummaryCard
                      submission={{
                        id: submission.id,
                        amount: Number(submission.amount),
                        paymentMethod: submission.paymentMethod,
                        transactionId: submission.transactionId,
                        paymentDate: submission.paymentDate.toISOString(),
                        status: submission.status,
                        rejectionReason: submission.rejectionReason,
                        reviewedAt: submission.reviewedAt?.toISOString() || null,
                        createdAt: submission.createdAt.toISOString(),
                        invoice: {
                          id: invoice.id,
                          invoiceNumber: invoice.invoiceNumber,
                          currency: invoice.currency,
                          studentProfile: {
                            studentId: invoice.studentProfile.studentId,
                            user: {
                              firstName: invoice.studentProfile.user.firstName,
                              lastName: invoice.studentProfile.user.lastName,
                            },
                          },
                        },
                        submittedBy: {
                          firstName: submission.submittedBy.firstName,
                          lastName: submission.submittedBy.lastName,
                          role: submission.submittedBy.role,
                        },
                        reviewedBy: submission.reviewedBy
                          ? {
                              firstName: submission.reviewedBy.firstName,
                              lastName: submission.reviewedBy.lastName,
                            }
                          : null,
                      }}
                      showInvoiceLink={false}
                    />
                    <Link href={`/admin/finance/manual-payments/${submission.id}`}>
                      <Button variant="outline" size="sm">
                        {submission.status === "pending" ? "Review Submission" : "View Submission"}
                      </Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
                  paymentMethod: payment.paymentMethod,
                  transactionReference: payment.transactionReference,
                  paymentDate: payment.paymentDate.toISOString(),
                  status: payment.status,
                  recordedBy: payment.recordedBy,
                }))}
                fallbackCurrency={invoice.currency}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Timeline</CardTitle>
              <CardDescription>
                End-to-end billing and submission activity for this invoice.
              </CardDescription>
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
            pendingSubmission={pendingSubmissionCount > 0}
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
                      <div>
                        <p className="text-sm">{adjustment.label}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {adjustment.type}
                        </p>
                      </div>
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

          {canWaive && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Waive the remaining balance if this invoice should no longer be
                  collectible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={waiveInvoiceAction}>
                  <Button variant="destructive" type="submit" className="w-full">
                    <Ban className="mr-2 h-4 w-4" />
                    Waive Invoice
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {pendingSubmissionCount > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                  <AlertCircle className="h-5 w-5" />
                  Review Needed
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-yellow-700 dark:text-yellow-300">
                There are {pendingSubmissionCount} manual payment submission
                {pendingSubmissionCount !== 1 ? "s" : ""} pending on this invoice.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
