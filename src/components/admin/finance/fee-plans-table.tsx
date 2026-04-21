"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Trash2, Eye, Copy } from "lucide-react"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CurrencyAmount } from "@/components/ui/currency-amount"

interface FeePlan {
  id: string
  name: string
  description: string | null
  amount: number | string
  currency: string
  frequency: string
  dueDayOfMonth: number | null
  lateFeeAmount: number | string | null
  lateFeeType: string | null
  isActive: boolean
  _count: {
    classAssignments: number
    invoices: number
  }
}

interface FeePlansTableProps {
  feePlans: FeePlan[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
}

const frequencyLabels: Record<string, string> = {
  one_time: "One Time",
  monthly: "Monthly",
  term: "Term",
  yearly: "Yearly",
}

export function FeePlansTable({
  feePlans,
  total,
  page,
  limit,
  onPageChange,
}: FeePlansTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.ceil(total / limit)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/finance/fee-plans/${deleteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        router.refresh()
        setDeleteId(null)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete fee plan")
      }
    } catch (error) {
      console.error("Failed to delete fee plan:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Late Fee</TableHead>
              <TableHead>Classes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feePlans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No fee plans found
                </TableCell>
              </TableRow>
            ) : (
              feePlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      {plan.description && (
                        <p className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CurrencyAmount
                      amount={plan.amount}
                      currency={plan.currency}
                      className="font-medium"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{frequencyLabels[plan.frequency] || plan.frequency}</p>
                      {plan.frequency === "monthly" && plan.dueDayOfMonth && (
                        <p className="text-sm text-muted-foreground">
                          Due day {plan.dueDayOfMonth}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {plan.lateFeeType && plan.lateFeeAmount ? (
                      <div>
                        <p className="text-sm">
                          {plan.lateFeeType === "fixed" ? (
                            <CurrencyAmount
                              amount={plan.lateFeeAmount}
                              currency={plan.currency}
                            />
                          ) : (
                            `${plan.lateFeeAmount}%`
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {plan.lateFeeType === "fixed" ? "Fixed" : "Percentage"}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {plan._count.classAssignments} class
                      {plan._count.classAssignments !== 1 ? "es" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? "success" : "secondary"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
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
                          <Link href={`/admin/finance/fee-plans/${plan.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/finance/fee-plans/${plan.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/finance/fee-plans/new?copy=${plan.id}`}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(plan.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)}{" "}
            of {total} fee plans
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the fee
              plan. Existing invoices using this plan will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
