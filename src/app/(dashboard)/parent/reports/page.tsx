import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getParentReportsPageData } from "@/lib/reports/portal-report-data"
import { ParentReportsPageContent } from "@/components/reports/parent-reports-page-content"

interface ParentReportsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    reportType?: string | string[]
    studentId?: string | string[]
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

export default async function ParentReportsPage({
  searchParams,
}: ParentReportsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "parent") {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 10)
  const reportType = getSingleSearchParam(searchParams?.reportType) || ""
  const studentId = getSingleSearchParam(searchParams?.studentId) || ""
  const classId = getSingleSearchParam(searchParams?.classId) || ""

  const data = await getParentReportsPageData({
    userId: session.user.id,
    page,
    limit,
    reportType,
    studentId,
    classId,
  })

  if (!data) {
    redirect("/login")
  }

  return (
    <ParentReportsPageContent
      key={`${reportType}-${studentId}-${classId}-${page}-${limit}`}
      reports={data.reports}
      total={data.total}
      page={page}
      limit={limit}
      children={data.children}
      availableClasses={data.availableClasses}
      appliedReportType={reportType}
      appliedStudentId={studentId}
      appliedClassId={classId}
    />
  )
}
