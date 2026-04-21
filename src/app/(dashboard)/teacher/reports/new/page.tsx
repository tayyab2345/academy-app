import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ReportForm } from "@/components/teacher/reports/report-form"

export const metadata: Metadata = {
  title: "Create Report - Teacher - AcademyFlow",
  description: "Create a new progress report",
}

export default async function NewReportPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create New Report</h2>
        <p className="text-muted-foreground">
          Create a progress report for a student in your class
        </p>
      </div>

      <ReportForm />
    </div>
  )
}
