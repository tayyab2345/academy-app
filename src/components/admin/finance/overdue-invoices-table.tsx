"use client"

import Link from "next/link"
import { AlertCircle, Eye } from "lucide-react"
import type { AdminFinanceOverdueInvoiceItem } from "@/lib/finance/admin-finance-data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge"

interface OverdueInvoicesTableProps {
  invoices: AdminFinanceOverdueInvoiceItem[]
}

export function OverdueInvoicesTable({ invoices }: OverdueInvoicesTableProps) {
  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diff = now.getTime() - due.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  if (invoices.length === 0) {
    return (
      <div className="py-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No overdue invoices</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Amount Due</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Days Overdue</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const daysOverdue = getDaysOverdue(invoice.dueDate)

            return (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono text-sm">
                  {invoice.invoiceNumber}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {invoice.studentProfile.user.firstName}{" "}
                      {invoice.studentProfile.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.studentProfile.studentId}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <CurrencyAmount
                    amount={invoice.outstandingAmount}
                    currency={invoice.currency}
                    className="font-medium text-red-600"
                  />
                </TableCell>
                <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={daysOverdue > 30 ? "destructive" : "warning"}>
                    {daysOverdue} days
                  </Badge>
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status as any} />
                </TableCell>
                <TableCell>
                  <Link href={`/admin/finance/invoices/${invoice.id}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
