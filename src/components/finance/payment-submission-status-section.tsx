"use client"

import { useState } from "react"
import { CheckCircle, Clock, Info } from "lucide-react"
import { PaymentMethod, SubmissionStatus } from "@prisma/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { ManualPaymentForm } from "@/components/finance/manual-payment-form"
import { ManualPaymentSummaryCard } from "@/components/finance/manual-payment-summary-card"
import { RejectionReasonAlert } from "@/components/finance/rejection-reason-alert"
import { cn } from "@/lib/utils"

interface PaymentSubmissionStatusSectionProps {
  invoiceId: string
  invoiceNumber: string
  currency: string
  outstandingAmount: number
  userRole: "parent" | "student"
  submission: {
    id: string
    amount: number
    paymentMethod: PaymentMethod
    transactionId: string | null
    paymentDate: string
    status: SubmissionStatus
    rejectionReason: string | null
    reviewedBy: {
      firstName: string
      lastName: string
    } | null
    reviewedAt: string | null
    createdAt: string
  } | null
  hasPendingSubmissionForInvoice?: boolean
}

const statusCardConfig = {
  pending: {
    icon: Clock,
    iconClassName: "text-yellow-600",
    className: "bg-yellow-50 dark:bg-yellow-950/20",
    title: "Payment Proof Submitted",
    description:
      "Your payment proof has been submitted and is awaiting verification.",
  },
  approved: {
    icon: CheckCircle,
    iconClassName: "text-green-600",
    className: "bg-green-50 dark:bg-green-950/20",
    title: "Payment Verified",
    description: "Your payment has been verified and recorded.",
  },
} as const

export function PaymentSubmissionStatusSection({
  invoiceId,
  invoiceNumber,
  currency,
  outstandingAmount,
  userRole,
  submission,
  hasPendingSubmissionForInvoice = false,
}: PaymentSubmissionStatusSectionProps) {
  const [showResubmit, setShowResubmit] = useState(false)

  if (showResubmit) {
    return (
      <ManualPaymentForm
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        currency={currency}
        outstandingAmount={outstandingAmount}
        userRole={userRole}
        latestSubmission={
          submission
            ? {
                id: submission.id,
                status: submission.status,
                rejectionReason: submission.rejectionReason,
              }
            : null
        }
      />
    )
  }

  if (!submission && !hasPendingSubmissionForInvoice) {
    return (
      <ManualPaymentForm
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        currency={currency}
        outstandingAmount={outstandingAmount}
        userRole={userRole}
      />
    )
  }

  if (submission?.status === "rejected" && !hasPendingSubmissionForInvoice) {
    return (
      <div className="space-y-4">
        <RejectionReasonAlert
          reason={submission.rejectionReason || "No reason provided"}
          reviewedBy={submission.reviewedBy || undefined}
          reviewedAt={submission.reviewedAt || undefined}
          onResubmit={() => setShowResubmit(true)}
        />
        <ManualPaymentSummaryCard
          submission={{
            ...submission,
            invoice: {
              id: invoiceId,
              invoiceNumber,
              currency,
              studentProfile: {
                studentId: "N/A",
                user: {
                  firstName: "You",
                  lastName: "",
                },
              },
            },
            submittedBy: {
              firstName: "You",
              lastName: "",
              role: userRole,
            },
          }}
          showInvoiceLink={false}
        />
      </div>
    )
  }

  if (!submission && hasPendingSubmissionForInvoice) {
    return (
      <Card className="bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Payment Proof Pending Review
          </CardTitle>
          <CardDescription>
            A payment proof for this invoice is already awaiting finance-team
            verification.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!submission) {
    return null
  }

  const config = statusCardConfig[submission.status as "pending" | "approved"]

  return (
    <div className="space-y-4">
      <Card className={config.className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <config.icon className={cn("h-5 w-5", config.iconClassName)} />
            {config.title}
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Amount Submitted</p>
              <p className="font-medium">
                <CurrencyAmount amount={submission.amount} currency={currency} />
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Submitted On</p>
              <p className="font-medium">
                {new Date(submission.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {submission.reviewedBy && (
            <p className="text-xs text-muted-foreground">
              Reviewed by {submission.reviewedBy.firstName}{" "}
              {submission.reviewedBy.lastName}
              {submission.reviewedAt
                ? ` on ${new Date(submission.reviewedAt).toLocaleDateString()}`
                : ""}
            </p>
          )}

          {submission.status === "approved" && outstandingAmount > 0 && (
            <div className="rounded-md bg-background/70 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-blue-600" />
                There is still an outstanding balance on this invoice.
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowResubmit(true)}>
                Submit Another Payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ManualPaymentSummaryCard
        submission={{
          ...submission,
          invoice: {
            id: invoiceId,
            invoiceNumber,
            currency,
            studentProfile: {
              studentId: "N/A",
              user: {
                firstName: "You",
                lastName: "",
              },
            },
          },
          submittedBy: {
            firstName: "You",
            lastName: "",
            role: userRole,
          },
        }}
        showInvoiceLink={false}
      />
    </div>
  )
}
