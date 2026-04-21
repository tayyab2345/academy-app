"use client"

import { XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface RejectionReasonAlertProps {
  reason: string
  reviewedBy?: {
    firstName: string
    lastName: string
  }
  reviewedAt?: string
  onResubmit?: () => void
  showResubmit?: boolean
}

export function RejectionReasonAlert({
  reason,
  reviewedBy,
  reviewedAt,
  onResubmit,
  showResubmit = true,
}: RejectionReasonAlertProps) {
  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between gap-4">
        <span>Payment Submission Rejected</span>
        {showResubmit && onResubmit && (
          <Button variant="outline" size="sm" onClick={onResubmit}>
            Submit New Payment
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>
          <strong>Reason:</strong> {reason}
        </p>
        {reviewedBy && (
          <p className="text-xs">
            Reviewed by {reviewedBy.firstName} {reviewedBy.lastName}
            {reviewedAt
              ? ` on ${new Date(reviewedAt).toLocaleDateString()}`
              : ""}
          </p>
        )}
        <p className="text-xs">
          Please review the payment instructions and submit a new payment proof
          with correct details.
        </p>
      </AlertDescription>
    </Alert>
  )
}
