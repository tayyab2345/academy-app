"use client"

import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface PendingSubmissionsAlertProps {
  count: number
}

export function PendingSubmissionsAlert({
  count,
}: PendingSubmissionsAlertProps) {
  if (count === 0) {
    return null
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
      <Clock className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-400">
        Pending Payment Submissions
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-yellow-700 dark:text-yellow-300">
          You have {count} payment submission{count !== 1 ? "s" : ""} awaiting
          review.
        </span>
        <Link href="/admin/finance/manual-payments?status=pending">
          <Button variant="outline" size="sm" className="border-yellow-300">
            Review Now
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  )
}
