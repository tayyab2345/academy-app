import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getAdminReportsPageData,
  getSingleSearchParam,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { ReportsPageContent } from "@/components/admin/reports/reports-page-content"

interface ReportsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    search?: string | string[]
    status?: string | string[]
    reportType?: string | string[]
    classId?: string | string[]
    teacherId?: string | string[]
  }
}

export default async function AdminReportsPage({
  searchParams,
}: ReportsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const page = parsePositiveInt(
    getSingleSearchParam(searchParams?.page),
    1
  )
  const limit = parsePositiveInt(
    getSingleSearchParam(searchParams?.limit),
    DEFAULT_PAGE_SIZE,
    100
  )
  const search = getSingleSearchParam(searchParams?.search) || ""
  const status = getSingleSearchParam(searchParams?.status) || ""
  const reportType = getSingleSearchParam(searchParams?.reportType) || ""
  const classId = getSingleSearchParam(searchParams?.classId) || ""
  const teacherId = getSingleSearchParam(searchParams?.teacherId) || ""

  const data = await getAdminReportsPageData({
    academyId: session.user.academyId,
    page,
    limit,
    search,
    status,
    reportType,
    classId,
    studentId: "",
    teacherId,
  })

  return (
    <ReportsPageContent
      key={`${search}-${status}-${reportType}-${classId}-${teacherId}-${page}-${limit}`}
      reports={data.reports}
      total={data.total}
      page={page}
      limit={limit}
      summary={data.summary}
      availableClasses={data.availableClasses}
      availableTeachers={data.availableTeachers}
      appliedSearch={search}
      appliedStatusFilter={status}
      appliedTypeFilter={reportType}
      appliedClassFilter={classId}
      appliedTeacherFilter={teacherId}
    />
  )
}
