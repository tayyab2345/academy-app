import { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getTeacherPayrollRecordDetail } from "@/lib/payroll/payroll-data"
import { PayrollRecordDetail } from "@/components/payroll/payroll-record-detail"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Payroll Record - Teacher - AcademyFlow",
  description: "Review your salary breakdown, deductions, and salary slip",
}

interface TeacherPayrollRecordPageProps {
  params: {
    recordId: string
  }
}

export default async function TeacherPayrollRecordPage({
  params,
}: TeacherPayrollRecordPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const data = await getTeacherPayrollRecordDetail({
    academyId: session.user.academyId,
    userId: session.user.id,
    recordId: params.recordId,
  })

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
            Review your salary breakdown, adjustment history, and salary slip for this pay period.
          </p>
        </div>
        <Link href="/teacher/payroll">
          <Button variant="outline">Back to Payroll</Button>
        </Link>
      </div>

      <PayrollRecordDetail
        record={data.record}
        history={data.history}
        mode="teacher"
      />
    </div>
  )
}
