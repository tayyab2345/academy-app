"use client"

import { useEffect, useState } from "react"
import { DollarSign, TrendingUp, AlertCircle, FileText } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { Skeleton } from "@/components/ui/skeleton"
import { SUPPORTED_CURRENCIES } from "@/lib/currency-utils"

interface SummaryData {
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  totalOverdue: number
  invoiceCount: number
}

interface FinanceSummaryCardsProps {
  academyCurrency?: string
}

export function FinanceSummaryCards({
  academyCurrency = "USD",
}: FinanceSummaryCardsProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [summaryByCurrency, setSummaryByCurrency] = useState<
    Record<string, SummaryData>
  >({})
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      const response = await fetch("/api/admin/finance/summary")
      const data = await response.json()
      setSummary(data.summary)

      const byCurrency: Record<string, SummaryData> = {}
      data.summaryByCurrency?.forEach(
        (item: SummaryData & { currency: string }) => {
          byCurrency[item.currency] = item
        }
      )
      setSummaryByCurrency(byCurrency)
    } catch (error) {
      console.error("Failed to fetch summary:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const displayData =
    selectedCurrency === "all"
      ? summary
      : summaryByCurrency[selectedCurrency] || {
          totalInvoiced: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          totalOverdue: 0,
          invoiceCount: 0,
        }

  const displayCurrency =
    selectedCurrency === "all" ? academyCurrency : selectedCurrency

  const collectionRate =
    displayData && displayData.totalInvoiced > 0
      ? (displayData.totalPaid / displayData.totalInvoiced) * 100
      : 0

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
          <SelectTrigger className="w-[180px]">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  <CurrencyAmount
                    amount={displayData?.totalInvoiced || 0}
                    currency={displayCurrency}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {displayData?.invoiceCount || 0} invoices
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  <CurrencyAmount
                    amount={displayData?.totalPaid || 0}
                    currency={displayCurrency}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {collectionRate.toFixed(1)}% collection rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-600">
                  <CurrencyAmount
                    amount={displayData?.totalOutstanding || 0}
                    currency={displayCurrency}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Awaiting payment</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  <CurrencyAmount
                    amount={displayData?.totalOverdue || 0}
                    currency={displayCurrency}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Past due date</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
