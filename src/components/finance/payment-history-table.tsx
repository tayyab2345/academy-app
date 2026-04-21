"use client"

import { PaymentMethod, PaymentStatus, SubmissionStatus } from "@prisma/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { PaymentStatusBadge } from "@/components/finance/payment-status-badge"
import { paymentMethodLabels } from "@/lib/manual-payment-utils"

interface PaymentHistoryTableProps {
  payments: Array<{
    id: string
    amount: number
    currency: string
    paymentMethod: PaymentMethod
    transactionReference: string | null
    paymentDate: string
    status: PaymentStatus
    recordedBy: {
      firstName: string
      lastName: string
    } | null
    isManualSubmission?: boolean
    submissionStatus?: SubmissionStatus
  }>
  fallbackCurrency?: string
  showRecordedBy?: boolean
}

const manualSubmissionStatusConfig: Record<
  SubmissionStatus,
  { label: string; variant: "warning" | "success" | "destructive" }
> = {
  pending: { label: "Pending Review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
}

export function PaymentHistoryTable({
  payments,
  fallbackCurrency,
  showRecordedBy = true,
}: PaymentHistoryTableProps) {
  if (payments.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        No payment history available
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Status</TableHead>
          {showRecordedBy && <TableHead>Recorded By</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell>
              {new Date(payment.paymentDate).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <CurrencyAmount
                amount={payment.amount}
                currency={payment.currency || fallbackCurrency || "USD"}
                className="font-medium"
              />
            </TableCell>
            <TableCell>{paymentMethodLabels[payment.paymentMethod]}</TableCell>
            <TableCell className="font-mono text-sm">
              {payment.transactionReference || "-"}
            </TableCell>
            <TableCell>
              {payment.isManualSubmission && payment.submissionStatus ? (
                <Badge
                  variant={manualSubmissionStatusConfig[payment.submissionStatus].variant}
                >
                  {manualSubmissionStatusConfig[payment.submissionStatus].label}
                </Badge>
              ) : (
                <PaymentStatusBadge status={payment.status} />
              )}
            </TableCell>
            {showRecordedBy && (
              <TableCell>
                {payment.recordedBy
                  ? `${payment.recordedBy.firstName} ${payment.recordedBy.lastName}`
                  : "-"}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
