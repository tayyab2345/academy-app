import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { PortalResultsPageContent } from "@/components/results/portal-results-page-content"
import { getStudentResultsPageData } from "@/lib/results/result-data"

interface StudentResultsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    classId?: string | string[]
    type?: string | string[]
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

export default async function StudentResultsPage({
  searchParams,
}: StudentResultsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 10)
  const classId = getSingleSearchParam(searchParams?.classId) || ""
  const type = getSingleSearchParam(searchParams?.type) || ""

  const data = await getStudentResultsPageData({
    userId: session.user.id,
    academyId: session.user.academyId,
    page,
    limit,
    classId,
    type,
  })

  if (!data) {
    redirect("/login")
  }

  return (
    <PortalResultsPageContent
      title="My Results"
      description="Review your marks, percentages, grades, and shared marksheets."
      basePath="/student/results"
      results={data.results}
      total={data.total}
      page={page}
      limit={limit}
      availableClasses={data.availableClasses}
      appliedType={type}
      appliedClassId={classId}
      emptyMessage="No results available yet."
    />
  )
}
