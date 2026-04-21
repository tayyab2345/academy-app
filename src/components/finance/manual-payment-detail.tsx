"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PaymentMethod } from "@prisma/client"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Receipt,
  XCircle,
} from "lucide-react"
import { paymentMethodLabels } from "@/lib/manual-payment-utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { PaymentSubmissionStatusBadge } from "@/components/finance/payment-submission-status-badge"
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge"
import { PaymentStatusBadge } from "@/components/finance/payment-status-badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

interface ManualPaymentDetailProps {
  submission: {
    id: string
    status: "pending" | "approved" | "rejected"
    rejectionReason: string | null
    amount: number
    currency: string
    paymentMethod: PaymentMethod
    transactionId: string | null
    paymentDate: string
    note: string | null
    receiptUrl: string | null
    createdAt: string
    reviewedAt: string | null
    submittedBy: {
      name: string
      role: string
      email: string | null
    }
    reviewedBy: {
      name: string
    } | null
    invoice: {
      id: string
      invoiceNumber: string
      description: string
      status: "draft" | "sent" | "partial" | "paid" | "overdue" | "waived"
      classLabel: string | null
      studentName: string
      studentId: string
      studentEmail: string | null
      parentContacts: Array<{
        name: string
        email: string | null
      }>
      totalAmount: number
      paidAmount: number
      outstandingAmount: number
      payments: Array<{
        id: string
        amount: number
        currency: string
        status: "pending" | "completed" | "failed" | "refunded"
        paymentMethod: string
        paymentDate: string
      }>
    }
  }
}

export function ManualPaymentDetail({ submission }: ManualPaymentDetailProps) {
  const router = useRouter()
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const canReview = submission.status === "pending"
  const isReceiptPdf = submission.receiptUrl?.toLowerCase().includes(".pdf") || false

  async function handleApprove() {
    setIsApproving(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/admin/manual-payments/${submission.id}/approve`,
        {
          method: "POST",
        }
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve submission")
      }

      router.refresh()
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Failed to approve submission"
      )
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      setError("A rejection reason is required.")
      return
    }

    setIsRejecting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/admin/manual-payments/${submission.id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rejectionReason: rejectionReason.trim(),
          }),
        }
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reject submission")
      }

      router.refresh()
    } catch (rejectError) {
      setError(
        rejectError instanceof Error
          ? rejectError.message
          : "Failed to reject submission"
      )
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-mono text-xl">
                    {submission.invoice.invoiceNumber}
                  </CardTitle>
                  <CardDescription>
                    Submitted on{" "}
                    {new Date(submission.createdAt).toLocaleString()}
                  </CardDescription>
                </div>
                <PaymentSubmissionStatusBadge status={submission.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Submission Amount
                </p>
                <p className="text-2xl font-bold">
                  <CurrencyAmount
                    amount={submission.amount}
                    currency={submission.currency}
                  />
                </p>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Payment Method
                    </p>
                  <p>{paymentMethodLabels[submission.paymentMethod]}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Payment Date
                  </p>
                  <p>{new Date(submission.paymentDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Transaction Reference
                  </p>
                  <p>{submission.transactionId || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Invoice Status
                  </p>
                  <InvoiceStatusBadge status={submission.invoice.status} />
                </div>
              </div>

              {submission.note && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Submitter Note
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{submission.note}</p>
                  </div>
                </>
              )}

              {submission.rejectionReason && (
                <>
                  <Separator />
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <p className="font-medium">Rejection Reason</p>
                    <p className="mt-1">{submission.rejectionReason}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receipt Evidence</CardTitle>
              <CardDescription>
                Review the uploaded payment proof before approving it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission.receiptUrl ? (
                <>
                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <Link href={submission.receiptUrl} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Receipt
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href={`${submission.receiptUrl}?download=1`} target="_blank">
                        <Receipt className="mr-2 h-4 w-4" />
                        Download
                      </Link>
                    </Button>
                  </div>

                  {!isReceiptPdf && (
                    <div className="overflow-hidden rounded-lg border">
                      <img
                        src={submission.receiptUrl}
                        alt="Payment receipt"
                        className="max-h-[420px] w-full object-contain bg-muted/20"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No receipt file was uploaded with this submission.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Official Payment History</CardTitle>
              <CardDescription>
                Recorded payments already attached to this invoice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submission.invoice.payments.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No official payments recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {submission.invoice.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <CurrencyAmount
                            amount={payment.amount}
                            currency={payment.currency}
                            className="font-medium"
                          />
                          <PaymentStatusBadge status={payment.status} />
                        </div>
                        <p className="text-sm capitalize text-muted-foreground">
                          {payment.paymentMethod.replaceAll("_", " ")}
                        </p>
                      </div>
                      <p className="text-sm">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Student</p>
                <p className="font-medium">{submission.invoice.studentName}</p>
                <p className="text-sm text-muted-foreground">
                  {submission.invoice.studentId}
                </p>
                {submission.invoice.studentEmail && (
                  <p className="text-sm text-muted-foreground">
                    {submission.invoice.studentEmail}
                  </p>
                )}
              </div>

              {submission.invoice.classLabel && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Class</p>
                  <p>{submission.invoice.classLabel}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Submitted By
                </p>
                <p>{submission.submittedBy.name}</p>
                <p className="text-sm capitalize text-muted-foreground">
                  {submission.submittedBy.role}
                </p>
                {submission.submittedBy.email && (
                  <p className="text-sm text-muted-foreground">
                    {submission.submittedBy.email}
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Invoice Total</span>
                <CurrencyAmount
                  amount={submission.invoice.totalAmount}
                  currency={submission.currency}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Already Paid</span>
                <CurrencyAmount
                  amount={submission.invoice.paidAmount}
                  currency={submission.currency}
                  className="text-green-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Outstanding</span>
                <CurrencyAmount
                  amount={submission.invoice.outstandingAmount}
                  currency={submission.currency}
                  className="font-semibold"
                />
              </div>

              <Separator />

              <Button asChild variant="outline" className="w-full">
                <Link href={`/admin/finance/invoices/${submission.invoice.id}`}>
                  Open Invoice
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Family Contacts</CardTitle>
              <CardDescription>
                Parent contacts linked to this invoice&apos;s student.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submission.invoice.parentContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No parent contacts linked.
                </p>
              ) : (
                <div className="space-y-3">
                  {submission.invoice.parentContacts.map((contact, index) => (
                    <div key={`${contact.name}-${index}`}>
                      <p className="font-medium">{contact.name}</p>
                      {contact.email && (
                        <p className="text-sm text-muted-foreground">
                          {contact.email}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {canReview && (
            <Card>
              <CardHeader>
                <CardTitle>Review Submission</CardTitle>
                <CardDescription>
                  Approve to record an official payment, or reject with a reason.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full"
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting}
                >
                  {isApproving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Approve Submission
                </Button>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Rejection Reason
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Explain why this submission is being rejected..."
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    disabled={isApproving || isRejecting}
                  />
                </div>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleReject}
                  disabled={isApproving || isRejecting}
                >
                  {isRejecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Reject Submission
                </Button>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!canReview && (
            <Card>
              <CardHeader>
                <CardTitle>Review Outcome</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p>
                      This submission was reviewed on{" "}
                      {submission.reviewedAt
                        ? new Date(submission.reviewedAt).toLocaleString()
                        : "an earlier date"}
                      .
                    </p>
                    {submission.reviewedBy && (
                      <p className="text-muted-foreground">
                        Reviewed by {submission.reviewedBy.name}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
