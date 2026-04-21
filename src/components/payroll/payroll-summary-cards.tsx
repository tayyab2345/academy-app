import {
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  ReceiptText,
} from "lucide-react"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PayrollSummaryTotals } from "@/lib/payroll/payroll-data"

interface PayrollSummaryCardsProps {
  summary: PayrollSummaryTotals
}

function CurrencyBreakdown({
  items,
}: {
  items: Array<{
    currency: string
    amount: number
  }>
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No records yet</p>
  }

  if (items.length === 1) {
    return (
      <p className="text-2xl font-bold">
        <CurrencyAmount amount={items[0].amount} currency={items[0].currency} />
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <p key={item.currency} className="text-sm font-medium">
          <CurrencyAmount amount={item.amount} currency={item.currency} />
        </p>
      ))}
    </div>
  )
}

export function PayrollSummaryCards({ summary }: PayrollSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Base Salary</CardTitle>
          <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <CurrencyBreakdown items={summary.baseByCurrency} />
          <p className="text-xs text-muted-foreground">
            {summary.totalRecords} payroll record
            {summary.totalRecords === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Payable</CardTitle>
          <ReceiptText className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <CurrencyBreakdown items={summary.netByCurrency} />
          <p className="text-xs text-muted-foreground">
            Bonuses and deductions are already reflected here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
          <BadgeCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <CurrencyBreakdown items={summary.paidByCurrency} />
          <p className="text-xs text-muted-foreground">
            {summary.paidCount} fully paid record
            {summary.paidCount === 1 ? "" : "s"} and {summary.finalizedCount} finalized
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          <Clock3 className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <CurrencyBreakdown items={summary.outstandingByCurrency} />
          <p className="text-xs text-muted-foreground">
            {summary.pendingCount + summary.partialCount} record
            {summary.pendingCount + summary.partialCount === 1 ? "" : "s"} still open
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
