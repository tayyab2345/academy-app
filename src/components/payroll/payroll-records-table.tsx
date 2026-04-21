"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PayrollRecordListItem } from "@/lib/payroll/payroll-data"
import { payrollRoleLabels } from "@/lib/payroll/payroll-utils"

interface PayrollRecordsTableProps {
  records: PayrollRecordListItem[]
  total?: number
  page?: number
  limit?: number
  basePath?: string
  detailBasePath?: string
  appliedRole?: string
  appliedUserId?: string
  appliedMonth?: string
  appliedStatus?: string
  showEmployee?: boolean
  showActions?: boolean
}

export function PayrollRecordsTable({
  records,
  total = 0,
  page = 1,
  limit = 10,
  basePath,
  detailBasePath = "/admin/payroll",
  appliedRole = "",
  appliedUserId = "",
  appliedMonth = "",
  appliedStatus = "",
  showEmployee = true,
  showActions = true,
}: PayrollRecordsTableProps) {
  const router = useRouter()

  function pushPage(nextPage: number) {
    if (!basePath) {
      return
    }

    const params = new URLSearchParams()

    if (appliedRole) {
      params.set("role", appliedRole)
    }

    if (appliedUserId) {
      params.set("userId", appliedUserId)
    }

    if (appliedMonth) {
      params.set("month", appliedMonth)
    }

    if (appliedStatus) {
      params.set("status", appliedStatus)
    }

    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())

    router.push(`${basePath}?${params.toString()}`)
  }

  if (records.length === 0) {
    return (
      <div className="rounded-lg border py-10 text-center text-sm text-muted-foreground">
        No payroll records found.
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            {showEmployee ? <TableHead>Employee</TableHead> : null}
            <TableHead>Role</TableHead>
            <TableHead>Net Payable</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Outstanding</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Adjustments</TableHead>
            <TableHead>Finalized</TableHead>
            {showActions ? <TableHead className="text-right">Action</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{record.periodLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(record.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </TableCell>
              {showEmployee ? (
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {record.user.firstName} {record.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.user.email}
                      {record.user.employeeId ? ` · ${record.user.employeeId}` : ""}
                    </p>
                  </div>
                </TableCell>
              ) : null}
              <TableCell>{payrollRoleLabels[record.role]}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">
                    <CurrencyAmount
                      amount={record.breakdown.netPayable}
                      currency={record.currency}
                    />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Base{" "}
                    <CurrencyAmount
                      amount={record.breakdown.baseSalary}
                      currency={record.currency}
                    />
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <CurrencyAmount amount={record.paidAmount} currency={record.currency} />
              </TableCell>
              <TableCell>
                <CurrencyAmount
                  amount={record.outstandingAmount}
                  currency={record.currency}
                />
              </TableCell>
              <TableCell>
                <PayrollStatusBadge status={record.status} />
              </TableCell>
              <TableCell>
                {record.adjustmentCount > 0 ? (
                  <div>
                    <p className="font-medium">{record.adjustmentCount}</p>
                    <p className="text-xs text-muted-foreground">
                      Bonus{" "}
                      <CurrencyAmount
                        amount={record.breakdown.totalBonuses}
                        currency={record.currency}
                      />
                    </p>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell>
                {record.isFinalized ? (
                  <div className="space-y-1">
                    <Badge variant="success">Finalized</Badge>
                    <p className="text-xs text-muted-foreground">
                      {record.finalizedAt
                        ? new Date(record.finalizedAt).toLocaleDateString()
                        : "Ready"}
                    </p>
                  </div>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </TableCell>
              {showActions ? (
                <TableCell className="text-right">
                  <Link href={`${detailBasePath}/${record.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {basePath && total > limit ? (
        <div className="flex items-center justify-between border-t p-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
            {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => pushPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => pushPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
