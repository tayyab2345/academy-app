"use client"

import { SubmissionStatus } from "@prisma/client"
import { CheckCircle, Clock, DollarSign, XCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CurrencyAmount } from "@/components/ui/currency-amount"

interface ManualPaymentsStatsCardsProps {
  stats: {
    total: number
    pending: number
    approved: number
    rejected: number
    totalsByCurrency: Array<{
      currency: string
      amount: number
    }>
  }
}

function renderAmountSummary(
  totalsByCurrency: ManualPaymentsStatsCardsProps["stats"]["totalsByCurrency"]
) {
  if (totalsByCurrency.length === 0) {
    return <span className="text-muted-foreground">No submissions yet</span>
  }

  if (totalsByCurrency.length === 1) {
    const [total] = totalsByCurrency
    return <CurrencyAmount amount={total.amount} currency={total.currency} />
  }

  return (
    <span className="text-xs text-muted-foreground">
      {totalsByCurrency
        .map((item) => `${item.currency} ${item.amount.toFixed(2)}`)
        .join(" • ")}
    </span>
  )
}

export function ManualPaymentsStatsCards({
  stats,
}: ManualPaymentsStatsCardsProps) {
  const statusCards: Array<{
    key: SubmissionStatus | "total"
    title: string
    value: number
    description: string
    icon: typeof DollarSign
    valueClassName?: string
  }> = [
    {
      key: "total",
      title: "Total Submissions",
      value: stats.total,
      description: "All manual payment submissions",
      icon: DollarSign,
    },
    {
      key: "pending",
      title: "Pending Review",
      value: stats.pending,
      description: "Awaiting verification",
      icon: Clock,
      valueClassName: "text-yellow-600",
    },
    {
      key: "approved",
      title: "Approved",
      value: stats.approved,
      description: "Successfully verified",
      icon: CheckCircle,
      valueClassName: "text-green-600",
    },
    {
      key: "rejected",
      title: "Rejected",
      value: stats.rejected,
      description: "Needs resubmission",
      icon: XCircle,
      valueClassName: "text-red-600",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {statusCards.map((card) => (
        <Card key={card.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.valueClassName || ""}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
            {card.key === "total" && (
              <div className="mt-2 text-xs">{renderAmountSummary(stats.totalsByCurrency)}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
