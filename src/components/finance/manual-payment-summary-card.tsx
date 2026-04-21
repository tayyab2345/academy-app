"use client"

import Link from "next/link"
import { PaymentMethod, Role, SubmissionStatus } from "@prisma/client"
import { Calendar, User } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { PaymentSubmissionStatusBadge } from "@/components/finance/payment-submission-status-badge"
import { paymentMethodLabels } from "@/lib/manual-payment-utils"

interface ManualPaymentSummaryCardProps {
  submission: {
    id: string
    amount: number
    paymentMethod: PaymentMethod
    transactionId: string | null
    paymentDate: string
    status: SubmissionStatus
    rejectionReason: string | null
    reviewedAt: string | null
    createdAt: string
    invoice: {
      id: string
      invoiceNumber: string
      currency: string
      studentProfile: {
        studentId: string
        user: {
          firstName: string
          lastName: string
        }
      }
    }
    submittedBy: {
      firstName: string
      lastName: string
      role: Role
    }
    reviewedBy: {
      firstName: string
      lastName: string
    } | null
  }
  showInvoiceLink?: boolean
}

export function ManualPaymentSummaryCard({
  submission,
  showInvoiceLink = true,
}: ManualPaymentSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              Payment Submission
              <PaymentSubmissionStatusBadge status={submission.status} />
            </CardTitle>
            <CardDescription>
              Submitted on {new Date(submission.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              <CurrencyAmount
                amount={submission.amount}
                currency={submission.invoice.currency}
              />
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Payment Method</p>
            <p className="font-medium">
              {paymentMethodLabels[submission.paymentMethod]}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment Date</p>
            <p className="font-medium">
              {new Date(submission.paymentDate).toLocaleDateString()}
            </p>
          </div>
          {submission.transactionId && (
            <div className="md:col-span-2">
              <p className="text-muted-foreground">Transaction ID</p>
              <p className="font-mono text-sm">{submission.transactionId}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>
            Submitted by {submission.submittedBy.firstName}{" "}
            {submission.submittedBy.lastName}
          </span>
          <Badge variant="outline" className="capitalize">
            {submission.submittedBy.role}
          </Badge>
        </div>

        {showInvoiceLink && (
          <div className="border-t pt-2">
            <Link
              href={`/admin/finance/invoices/${submission.invoice.id}`}
              className="text-sm text-primary hover:underline"
            >
              View Invoice {submission.invoice.invoiceNumber}
            </Link>
            <p className="text-xs text-muted-foreground">
              Student: {submission.invoice.studentProfile.user.firstName}{" "}
              {submission.invoice.studentProfile.user.lastName} (
              {submission.invoice.studentProfile.studentId})
            </p>
          </div>
        )}

        {submission.status === "rejected" && submission.rejectionReason && (
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">
              Rejection Reason
            </p>
            <p className="text-sm">{submission.rejectionReason}</p>
          </div>
        )}

        {submission.reviewedBy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Reviewed by {submission.reviewedBy.firstName}{" "}
              {submission.reviewedBy.lastName}
              {submission.reviewedAt
                ? ` on ${new Date(submission.reviewedAt).toLocaleDateString()}`
                : ""}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
