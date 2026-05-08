"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Eye, Landmark, WalletCards } from "lucide-react"
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
  const emptyLabel = showEmployee
    ? "No payroll records found"
    : "No salary history found"

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
      <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <WalletCards className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">{emptyLabel}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
          Salary and payroll records will appear here when they are prepared.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="hidden rounded-lg border md:block">
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
              {showActions ? (
                <TableHead className="text-right">Action</TableHead>
              ) : null}
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
                        {record.user.employeeId
                          ? ` - ${record.user.employeeId}`
                          : ""}
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
                  <CurrencyAmount
                    amount={record.paidAmount}
                    currency={record.currency}
                  />
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
      </div>

      <div className="space-y-3 md:hidden">
        {records.map((record) => (
          <article
            key={record.id}
            className="rounded-2xl border bg-card p-4 shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    Salary Period
                  </div>
                  <h3 className="mt-1 break-words text-base font-semibold leading-snug">
                    {record.periodLabel}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(record.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <PayrollStatusBadge status={record.status} />
              </div>

              {showEmployee ? (
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Employee
                  </p>
                  <p className="break-words text-sm font-semibold">
                    {record.user.firstName} {record.user.lastName}
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    {record.user.email}
                    {record.user.employeeId ? ` - ${record.user.employeeId}` : ""}
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                <MobilePayrollField
                  label="Role"
                  value={payrollRoleLabels[record.role]}
                />
                <MobilePayrollField
                  label="Base salary"
                  value={
                    <CurrencyAmount
                      amount={record.breakdown.baseSalary}
                      currency={record.currency}
                    />
                  }
                />
                <MobilePayrollField
                  label="Net payable"
                  value={
                    <CurrencyAmount
                      amount={record.breakdown.netPayable}
                      currency={record.currency}
                    />
                  }
                  emphasis
                />
                <MobilePayrollField
                  label="Paid amount"
                  value={
                    <CurrencyAmount
                      amount={record.paidAmount}
                      currency={record.currency}
                    />
                  }
                />
                <MobilePayrollField
                  label="Outstanding"
                  value={
                    <CurrencyAmount
                      amount={record.outstandingAmount}
                      currency={record.currency}
                    />
                  }
                />
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Finalized
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {record.isFinalized ? (
                      <>
                        <Badge variant="success">Finalized</Badge>
                        <span className="text-xs text-muted-foreground">
                          {record.finalizedAt
                            ? new Date(record.finalizedAt).toLocaleDateString()
                            : "Ready"}
                        </span>
                      </>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {record.adjustmentCount > 0
                        ? `${record.adjustmentCount} adjustment${
                            record.adjustmentCount !== 1 ? "s" : ""
                          }`
                        : "No adjustments"}
                    </p>
                    <p className="break-words text-xs text-muted-foreground">
                      Bonus{" "}
                      <CurrencyAmount
                        amount={record.breakdown.totalBonuses}
                        currency={record.currency}
                      />
                      {" | "}Deductions{" "}
                      <CurrencyAmount
                        amount={record.breakdown.totalDeductions}
                        currency={record.currency}
                      />
                    </p>
                  </div>
                </div>
              </div>

              {showActions ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`${detailBasePath}/${record.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View details
                  </Link>
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {basePath && total > limit ? (
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
            {total}
          </p>
          <div className="grid grid-cols-2 items-center gap-2 sm:flex">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => pushPage(page - 1)}
              className="w-full sm:w-auto"
            >
              Previous
            </Button>
            <span className="col-span-2 row-start-1 text-center text-sm sm:col-auto sm:row-auto">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => pushPage(page + 1)}
              className="w-full sm:w-auto"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MobilePayrollField({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: ReactNode
  emphasis?: boolean
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={
          emphasis
            ? "mt-1 break-words text-sm font-semibold text-primary"
            : "mt-1 break-words text-sm font-semibold"
        }
      >
        {value}
      </p>
    </div>
  )
}
