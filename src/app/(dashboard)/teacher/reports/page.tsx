import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
  getTeacherReportsPageData,
} from "@/lib/reports/portal-report-data"
import { TeacherReportsPageContent } from "@/components/teacher/reports/teacher-reports-page-content"

interface TeacherReportsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    status?: string | string[]
    reportType?: string | string[]
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

export default async function TeacherReportsPage({
  searchParams,
}: TeacherReportsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 10)
  const status = getSingleSearchParam(searchParams?.status) || ""
  const reportType = getSingleSearchParam(searchParams?.reportType) || ""

  const data = await getTeacherReportsPageData({
    userId: session.user.id,
    page,
    limit,
    status,
    reportType,
  })

  if (!data) {
    redirect("/login")
  }

  return (
    <TeacherReportsPageContent
      key={`${status}-${reportType}-${page}-${limit}`}
      reports={data.reports}
      total={data.total}
      page={page}
      limit={limit}
      appliedStatusFilter={status}
      appliedTypeFilter={reportType}
    />
  )
}
