import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { PortalResultsPageContent } from "@/components/results/portal-results-page-content"
import { getParentResultsPageData } from "@/lib/results/result-data"

interface ParentResultsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    classId?: string | string[]
    type?: string | string[]
    studentId?: string | string[]
  }
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function parsePositiveInt(value: string | undefined, fallback: number, max: number = 100) {
  const parsed = Number.parseInt(value || "", 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.min(parsed, max)
}

export default async function ParentResultsPage({
  searchParams,
}: ParentResultsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "parent") {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 10)
  const classId = getSingleSearchParam(searchParams?.classId) || ""
  const type = getSingleSearchParam(searchParams?.type) || ""
  const studentId = getSingleSearchParam(searchParams?.studentId) || ""

  const data = await getParentResultsPageData({
    userId: session.user.id,
    academyId: session.user.academyId,
    page,
    limit,
    studentId,
    classId,
    type,
  })

  if (!data) {
    redirect("/login")
  }

  return (
    <PortalResultsPageContent
      title="Children's Results"
      description="View exam performance, grades, and marksheets for your linked children."
      basePath="/parent/results"
      results={data.results}
      total={data.total}
      page={page}
      limit={limit}
      availableClasses={data.availableClasses}
      children={data.children}
      appliedType={type}
      appliedClassId={classId}
      appliedStudentId={studentId}
      emptyMessage="No results available for your linked children yet."
      showStudent
    />
  )
}
