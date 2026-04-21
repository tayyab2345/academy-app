import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getTeacherClassSessionsPageData } from "@/lib/teacher/teacher-class-data"
import { TeacherClassSessionsPageContent } from "@/components/teacher/sessions/teacher-class-sessions-page-content"

interface ClassSessionsPageProps {
  params: {
    classId: string
  }
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
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

export default async function ClassSessionsPage({
  params,
  searchParams,
}: ClassSessionsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 10)

  const data = await getTeacherClassSessionsPageData({
    userId: session.user.id,
    classId: params.classId,
    page,
    limit,
  })

  if (!data) {
    notFound()
  }

  return (
    <TeacherClassSessionsPageContent
      key={`${params.classId}-${page}-${limit}`}
      classId={params.classId}
      classInfo={data.classInfo}
      sessions={data.sessions}
      total={data.total}
      page={page}
      limit={limit}
    />
  )
}
