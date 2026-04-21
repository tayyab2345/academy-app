import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CompensationProfileListItem } from "@/lib/payroll/payroll-data"
import { payrollRoleLabels } from "@/lib/payroll/payroll-utils"

interface SalaryProfilesTableProps {
  profiles: CompensationProfileListItem[]
}

export function SalaryProfilesTable({ profiles }: SalaryProfilesTableProps) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-lg border py-10 text-center text-sm text-muted-foreground">
        No salary profiles have been configured yet.
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Monthly Salary</TableHead>
            <TableHead>Effective From</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Payroll</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => (
            <TableRow key={profile.id}>
              <TableCell>
                <div>
                  <p className="font-medium">
                    {profile.user.firstName} {profile.user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.user.email}
                    {profile.user.employeeId
                      ? ` · ${profile.user.employeeId}`
                      : ""}
                  </p>
                </div>
              </TableCell>
              <TableCell>{payrollRoleLabels[profile.user.role]}</TableCell>
              <TableCell>
                <CurrencyAmount amount={profile.amount} currency={profile.currency} />
              </TableCell>
              <TableCell>
                {new Date(profile.effectiveFrom).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge variant={profile.isActive ? "success" : "secondary"}>
                  {profile.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {profile.lastPayrollRecord ? (
                  <div>
                    <p className="text-sm">{profile.lastPayrollRecord.periodLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile.lastPayrollRecord.status}
                    </p>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No payroll yet
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/admin/payroll/settings?userId=${profile.user.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Edit Salary
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

