import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getStudentReportsPageData } from "@/lib/reports/portal-report-data"
import { StudentReportsPageContent } from "@/components/reports/student-reports-page-content"

interface StudentReportsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    reportType?: string | string[]
    classId?: string | string[]
  }
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
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

export default async function StudentReportsPage({
  searchParams,
}: StudentReportsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 10)
  const reportType = getSingleSearchParam(searchParams?.reportType) || ""
  const classId = getSingleSearchParam(searchParams?.classId) || ""

  const data = await getStudentReportsPageData({
    userId: session.user.id,
    page,
    limit,
    reportType,
    classId,
  })

  if (!data) {
    redirect("/login")
  }

  return (
    <StudentReportsPageContent
      key={`${reportType}-${classId}-${page}-${limit}`}
      reports={data.reports}
      total={data.total}
      page={page}
      limit={limit}
      availableClasses={data.availableClasses}
      appliedReportType={reportType}
      appliedClassId={classId}
    />
  )
}
