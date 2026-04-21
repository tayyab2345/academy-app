import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { ManageResultsPageContent } from "@/components/results/manage-results-page-content"
import { getManageableExamListPageData } from "@/lib/results/result-data"

interface TeacherResultsPageProps {
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

export default async function TeacherResultsPage({
  searchParams,
}: TeacherResultsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 10)
  const classId = getSingleSearchParam(searchParams?.classId) || ""
  const type = getSingleSearchParam(searchParams?.type) || ""

  const data = await getManageableExamListPageData({
    academyId: session.user.academyId,
    userId: session.user.id,
    role: session.user.role,
    page,
    limit,
    classId,
    type,
  })

  if (!data) {
    redirect("/login")
  }

  return (
    <ManageResultsPageContent
      title="Results"
      description="Create tests, enter marks, and upload result files for your assigned classes."
      basePath="/teacher/results"
      exams={data.exams}
      total={data.total}
      page={page}
      limit={limit}
      availableClasses={data.availableClasses}
      appliedType={type}
      appliedClassId={classId}
    />
  )
}
