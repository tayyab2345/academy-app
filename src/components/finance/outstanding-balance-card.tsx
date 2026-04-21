"use client"

import { AlertCircle, CheckCircle, Clock } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { Badge } from "@/components/ui/badge"

interface OutstandingBalanceCardProps {
  totalAmount: number
  paidAmount: number
  currency: string
  dueDate?: string | null
  status: string
  pendingSubmission?: boolean
}

export function OutstandingBalanceCard({
  totalAmount,
  paidAmount,
  currency,
  dueDate,
  status,
  pendingSubmission = false,
}: OutstandingBalanceCardProps) {
  const outstanding = Math.max(0, totalAmount - paidAmount)
  const paidPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
  const isPaid = status === "paid"
  const parsedDueDate = dueDate ? new Date(dueDate) : null
  const isOverdue = !!parsedDueDate && parsedDueDate < new Date() && !isPaid
  const isPartiallyPaid = paidAmount > 0 && paidAmount < totalAmount

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span>Payment Status</span>
          {isPaid && (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Paid in Full
            </Badge>
          )}
          {isPartiallyPaid && !isPaid && (
            <Badge variant="warning" className="gap-1">
              <Clock className="h-3 w-3" />
              Partially Paid
            </Badge>
          )}
          {!isPaid && !isPartiallyPaid && isOverdue && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Overdue
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-xl font-bold">
              <CurrencyAmount amount={totalAmount} currency={currency} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid So Far</p>
            <p className="text-xl font-bold text-green-600">
              <CurrencyAmount amount={paidAmount} currency={currency} />
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Outstanding</span>
            <span className="font-medium text-red-600">
              <CurrencyAmount amount={outstanding} currency={currency} />
            </span>
          </div>
          <Progress value={paidPercentage} className="h-2" />
        </div>

        {parsedDueDate && !isPaid && (
          <p className="text-xs text-muted-foreground">
            Due Date: {parsedDueDate.toLocaleDateString()}
            {isOverdue && (
              <span className="ml-2 text-red-600">
                (
                {Math.floor(
                  (Date.now() - parsedDueDate.getTime()) / (1000 * 60 * 60 * 24)
                )}{" "}
                days overdue)
              </span>
            )}
          </p>
        )}

        {pendingSubmission && (
          <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-950/20">
            <p className="flex items-center gap-1 text-sm text-yellow-700 dark:text-yellow-400">
              <Clock className="h-4 w-4" />
              Payment proof submitted - awaiting verification
            </p>
          </div>
        )}

        {isPaid && (
          <div className="rounded-md bg-green-50 p-3 dark:bg-green-950/20">
            <p className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              This invoice has been paid in full
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
