import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { getAdminPayrollRecordDetail } from "@/lib/payroll/payroll-data"
import { PayrollRecordDetail } from "@/components/payroll/payroll-record-detail"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Payroll Record - Admin - AcademyFlow",
  description: "Review and update a salary payroll record",
}

interface AdminPayrollRecordPageProps {
  params: {
    recordId: string
  }
}

export default async function AdminPayrollRecordPage({
  params,
}: AdminPayrollRecordPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const data = await getAdminPayrollRecordDetail(
    session.user.academyId,
    params.recordId
  )

  if (!data) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {data.record.periodLabel} Payroll
          </h2>
          <p className="text-muted-foreground">
            Review and update the salary record for {data.record.user.firstName}{" "}
            {data.record.user.lastName}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/payroll">
            <Button variant="outline">Back to Payroll</Button>
          </Link>
          <Link href="/admin/payroll/settings">
            <Button variant="outline">Salary Settings</Button>
          </Link>
        </div>
      </div>

      <PayrollRecordDetail
        record={data.record}
        history={data.history}
        mode="admin"
        settings={data.settings}
      />
    </div>
  )
}
