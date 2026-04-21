import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getTeacherPayrollPageData } from "@/lib/payroll/payroll-data"
import { PayrollRecordsTable } from "@/components/payroll/payroll-records-table"
import { PayrollSummaryCards } from "@/components/payroll/payroll-summary-cards"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CurrencyAmount } from "@/components/ui/currency-amount"

export const metadata: Metadata = {
  title: "Payroll - Teacher - AcademyFlow",
  description: "Review your salary history and payroll status",
}

export default async function TeacherPayrollPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const data = await getTeacherPayrollPageData(
    session.user.academyId,
    session.user.id
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payroll</h2>
        <p className="text-muted-foreground">
          Review your salary history and recent payroll records.
        </p>
      </div>

      <PayrollSummaryCards summary={data.summary} />

      <Card>
        <CardHeader>
          <CardTitle>Current Salary Profile</CardTitle>
          <CardDescription>
            Your current monthly salary setup inside the academy payroll system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.compensationProfile ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Salary</p>
                <p className="text-lg font-semibold">
                  <CurrencyAmount
                    amount={data.compensationProfile.amount}
                    currency={data.compensationProfile.currency}
                  />
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Effective From</p>
                <p className="text-lg font-semibold">
                  {new Date(data.compensationProfile.effectiveFrom).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold">
                  {data.compensationProfile.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payroll Records</p>
                <p className="text-lg font-semibold">
                  {data.compensationProfile.payrollRecordsCount}
                </p>
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">
                  {data.compensationProfile.notes || "No salary notes recorded."}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Your salary profile has not been configured yet. Please contact the academy admin for payroll setup.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary History</CardTitle>
        <CardDescription>
            Monthly payroll records visible only to you and academy admins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayrollRecordsTable
            records={data.records}
            showEmployee={false}
            showActions
            detailBasePath="/teacher/payroll"
          />
        </CardContent>
      </Card>
    </div>
  )
}
