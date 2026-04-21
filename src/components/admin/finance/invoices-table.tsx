"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Eye, Pencil, Send } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge"

interface Invoice {
  id: string
  invoiceNumber: string
  description: string
  amount: number
  taxAmount: number
  totalAmount: number
  currency: string
  dueDate: string
  status: string
  paidAmount: number
  outstandingAmount: number
  studentProfile: {
    studentId: string
    user: {
      firstName: string
      lastName: string
    }
  }
  class: {
    name: string
    course: {
      code: string
    }
  } | null
  _count: {
    payments: number
  }
}

interface InvoicesTableProps {
  invoices: Invoice[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onSend?: (invoiceId: string) => void
}

export function InvoicesTable({
  invoices,
  total,
  page,
  limit,
  onPageChange,
  onSend,
}: InvoicesTableProps) {
  const router = useRouter()
  const [sendingId, setSendingId] = useState<string | null>(null)

  const totalPages = Math.ceil(total / limit)

  const handleSend = async (invoiceId: string) => {
    setSendingId(invoiceId)

    try {
      const response = await fetch(
        `/api/admin/finance/invoices/${invoiceId}/send`,
        {
          method: "POST",
        }
      )

      if (response.ok) {
        router.refresh()
        onSend?.(invoiceId)
      }
    } catch (error) {
      console.error("Failed to send invoice:", error)
    } finally {
      setSendingId(null)
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
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
                      <p className="max-w-[200px] truncate">
                        {invoice.description}
                      </p>
                      {invoice.class && (
                        <p className="text-xs text-muted-foreground">
                          {invoice.class.course.code} - {invoice.class.name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <CurrencyAmount
                        amount={invoice.totalAmount}
                        currency={invoice.currency}
                      />
                    </TableCell>
                    <TableCell>
                      <CurrencyAmount
                        amount={invoice.outstandingAmount}
                        currency={invoice.currency}
                        className={
                          invoice.outstandingAmount > 0
                            ? "font-medium"
                            : "text-green-600"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status as any} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/finance/invoices/${invoice.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          {invoice.status !== "paid" && invoice.status !== "waived" && (
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/admin/finance/invoices/${invoice.id}/edit`}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {invoice.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleSend(invoice.id)}
                              disabled={sendingId === invoice.id}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              {sendingId === invoice.id ? "Sending..." : "Send"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
            {total} invoices
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
