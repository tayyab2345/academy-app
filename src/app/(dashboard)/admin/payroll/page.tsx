import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import {
  getAdminPayrollList,
  getPayrollStaffOptions,
  parsePayrollStatusFilter,
} from "@/lib/payroll/payroll-data"
import { AdminPayrollFilters } from "@/components/payroll/admin-payroll-filters"
import { PayrollRecordForm } from "@/components/payroll/payroll-record-form"
import { PayrollRecordsTable } from "@/components/payroll/payroll-records-table"
import { PayrollSummaryCards } from "@/components/payroll/payroll-summary-cards"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Payroll - Admin - AcademyFlow",
  description: "Manage staff salaries and payroll records",
}

interface AdminPayrollPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    role?: string | string[]
    userId?: string | string[]
    month?: string | string[]
    status?: string | string[]
  }
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max: number = 100
) {
  const parsed = Number.parseInt(value || "", 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.min(parsed, max)
}

export default async function AdminPayrollPage({
  searchParams,
}: AdminPayrollPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 10)
  const role = getSingleSearchParam(searchParams?.role) || ""
  const userId = getSingleSearchParam(searchParams?.userId) || ""
  const month = getSingleSearchParam(searchParams?.month) || ""
  const status = parsePayrollStatusFilter(
    getSingleSearchParam(searchParams?.status)
  )

  const [staffOptions, payrollData] = await Promise.all([
    getPayrollStaffOptions(
      session.user.academyId,
      userId ? [userId] : []
    ),
    getAdminPayrollList({
      academyId: session.user.academyId,
      page,
      limit,
      role: role === "teacher" || role === "admin" ? role : undefined,
      userId: userId || undefined,
      month: month || undefined,
      status,
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payroll</h2>
          <p className="text-muted-foreground">
            Manage teacher and admin staff salary records without leaving the academy portal.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/payroll/settings">
            <Button variant="outline">Salary Settings</Button>
          </Link>
          <Link href="/admin/finance">
            <Button variant="outline">Back to Finance</Button>
          </Link>
        </div>
      </div>

      <PayrollSummaryCards summary={payrollData.summary} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr,1fr]">
        <PayrollRecordForm
          staffOptions={staffOptions}
          initialUserId={userId || undefined}
        />

        <Card>
          <CardHeader>
            <CardTitle>Payroll Setup Guidance</CardTitle>
            <CardDescription>
              Use salary settings to define each staff member&apos;s base monthly salary and academy deduction rules before generating payroll.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Payroll records are unique per employee and month, which prevents duplicate salary rows for the same period.
            </p>
            <p>
              Bonuses, deductions, and advance adjustments are handled inside each payroll record so admins can review the net salary before finalization.
            </p>
            <p>
              Finalized payroll records generate a salary slip PDF. Teachers can review only their own salary history and salary slips from their portal.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
          <CardDescription>
            Review salary records by employee, role, month, and payment status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminPayrollFilters
            basePath="/admin/payroll"
            limit={limit}
            staffOptions={staffOptions}
            appliedRole={role}
            appliedUserId={userId}
            appliedMonth={month}
            appliedStatus={status || ""}
          />
          <PayrollRecordsTable
            records={payrollData.records}
            total={payrollData.total}
            page={payrollData.page}
            limit={limit}
            basePath="/admin/payroll"
            appliedRole={role}
            appliedUserId={userId}
            appliedMonth={month}
            appliedStatus={status || ""}
            showEmployee
            showActions
          />
        </CardContent>
      </Card>
    </div>
  )
}
