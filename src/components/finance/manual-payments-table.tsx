"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { PaymentMethod } from "@prisma/client"
import { paymentMethodLabels } from "@/lib/manual-payment-utils"
import { Button } from "@/components/ui/button"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { Input } from "@/components/ui/input"
import { PaymentSubmissionStatusBadge } from "@/components/finance/payment-submission-status-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ManualPaymentsTableProps {
  submissions: Array<{
    id: string
    invoiceId: string
    invoiceNumber: string
    studentName: string
    submittedByName: string
    submittedByRole: string
    amount: number
    currency: string
    paymentMethod: PaymentMethod
    status: "pending" | "approved" | "rejected"
    createdAt: string
    reviewedAt: string | null
  }>
  total: number
  pendingCount: number
  page: number
  limit: number
  appliedStatusFilter: string
  appliedInvoiceIdFilter: string
}

export function ManualPaymentsTable({
  submissions,
  total,
  page,
  limit,
  appliedStatusFilter,
  appliedInvoiceIdFilter,
}: ManualPaymentsTableProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState(appliedStatusFilter || "all")
  const [invoiceIdFilter, setInvoiceIdFilter] = useState(appliedInvoiceIdFilter)

  function pushWithFilters(nextPage: number, status: string, invoiceId: string) {
    const params = new URLSearchParams()

    if (status && status !== "all") {
      params.set("status", status)
    }

    if (invoiceId) {
      params.set("invoiceId", invoiceId)
    }

    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())

    router.push(`/admin/finance/manual-payments?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          pushWithFilters(1, statusFilter, invoiceIdFilter)
        }}
        className="flex flex-wrap gap-3 rounded-lg border p-4"
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by invoice ID..."
            value={invoiceIdFilter}
            onChange={(event) => setInvoiceIdFilter(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Apply Filters</Button>
        {(appliedStatusFilter || appliedInvoiceIdFilter) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStatusFilter("all")
              setInvoiceIdFilter("")
              router.push(`/admin/finance/manual-payments?limit=${limit}`)
            }}
          >
            Clear
          </Button>
        )}
      </form>

      <div className="rounded-lg border">
        {submissions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No manual payment submissions found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="font-mono text-xs">
                    {submission.invoiceNumber}
                  </TableCell>
                  <TableCell>{submission.studentName}</TableCell>
                  <TableCell>
                    <div>
                      <p>{submission.submittedByName}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {submission.submittedByRole}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CurrencyAmount
                      amount={submission.amount}
                      currency={submission.currency}
                    />
                  </TableCell>
                  <TableCell>
                    {paymentMethodLabels[submission.paymentMethod]}
                  </TableCell>
                  <TableCell>
                    <PaymentSubmissionStatusBadge status={submission.status} />
                  </TableCell>
                  <TableCell>
                    {new Date(submission.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/finance/manual-payments/${submission.id}`}>
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {total > limit && (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
              {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  pushWithFilters(
                    page - 1,
                    appliedStatusFilter,
                    appliedInvoiceIdFilter
                  )
                }
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  pushWithFilters(
                    page + 1,
                    appliedStatusFilter,
                    appliedInvoiceIdFilter
                  )
                }
                disabled={page >= Math.ceil(total / limit)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
