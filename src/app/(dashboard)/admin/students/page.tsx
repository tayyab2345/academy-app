import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getAdminStudentsPageData,
  getSingleSearchParam,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { StudentsPageContent } from "@/components/admin/students/students-page-content"

interface StudentsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    search?: string | string[]
    gradeLevel?: string | string[]
  }
}

export default async function StudentsPage({
  searchParams,
}: StudentsPageProps) {
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
  const gradeLevel = getSingleSearchParam(searchParams?.gradeLevel) || ""

  const data = await getAdminStudentsPageData({
    academyId: session.user.academyId,
    page,
    limit,
    search,
    gradeLevel,
  })

  return (
    <StudentsPageContent
      key={`${search}-${gradeLevel}-${page}-${limit}`}
      students={data.students}
      total={data.total}
      page={page}
      limit={limit}
      appliedSearch={search}
      appliedGradeFilter={gradeLevel}
    />
  )
}
