"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  TrendingUp,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SUPPORTED_CURRENCIES } from "@/lib/currency-utils"
import type {
  FinanceSummaryData,
  FinanceSummaryByCurrencyData,
} from "@/lib/finance/admin-finance-data"

interface FinanceSummaryCardsEnhancedProps {
  academyCurrency?: string
  showPendingSubmissions?: boolean
  summary: FinanceSummaryData
  summaryByCurrency: FinanceSummaryByCurrencyData[]
}

const emptySummary: FinanceSummaryData = {
  totalInvoiced: 0,
  totalPaid: 0,
  totalOutstanding: 0,
  totalOverdue: 0,
  invoiceCount: 0,
  paidCount: 0,
  overdueCount: 0,
  partialCount: 0,
  pendingSubmissions: 0,
}

export function FinanceSummaryCardsEnhanced({
  academyCurrency = "USD",
  showPendingSubmissions = true,
  summary,
  summaryByCurrency,
}: FinanceSummaryCardsEnhancedProps) {
  const [selectedCurrency, setSelectedCurrency] = useState("all")
  const summaryByCurrencyMap = useMemo(
    () =>
      summaryByCurrency.reduce<Record<string, FinanceSummaryByCurrencyData>>(
        (accumulator, item) => {
          accumulator[item.currency] = item
          return accumulator
        },
        {}
      ),
    [summaryByCurrency]
  )

  const displayData =
    selectedCurrency === "all"
      ? summary
      : summaryByCurrencyMap[selectedCurrency] || emptySummary
  const displayCurrency =
    selectedCurrency === "all" ? academyCurrency : selectedCurrency
  const collectionRate =
    displayData.totalInvoiced > 0
      ? (displayData.totalPaid / displayData.totalInvoiced) * 100
      : 0

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Filter by currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            {SUPPORTED_CURRENCIES.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={`grid gap-4 md:grid-cols-2 ${
          showPendingSubmissions ? "lg:grid-cols-5" : "lg:grid-cols-4"
        }`}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyAmount
                amount={displayData.totalInvoiced}
                currency={displayCurrency}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {displayData.invoiceCount} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <CurrencyAmount
                amount={displayData.totalPaid}
                currency={displayCurrency}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {collectionRate.toFixed(1)}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              <CurrencyAmount
                amount={displayData.totalOutstanding}
                currency={displayCurrency}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {displayData.partialCount} partial payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <CurrencyAmount
                amount={displayData.totalOverdue}
                currency={displayCurrency}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {displayData.overdueCount} overdue invoices
            </p>
          </CardContent>
        </Card>

        {showPendingSubmissions && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {displayData.pendingSubmissions}
              </div>
              <p className="text-xs text-muted-foreground">
                awaiting verification
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
