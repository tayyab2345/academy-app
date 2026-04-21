import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getSingleSearchParam,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { getAdminCoursesPageData } from "@/lib/admin/admin-lists-data"
import { CoursesPageContent } from "@/components/admin/courses/courses-page-content"

interface CoursesPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    search?: string | string[]
  }
}

export default async function CoursesPage({
  searchParams,
}: CoursesPageProps) {
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

  const data = await getAdminCoursesPageData({
    academyId: session.user.academyId,
    page,
    limit,
    search,
  })

  return (
    <CoursesPageContent
      key={`${search}-${page}-${limit}`}
      courses={data.courses}
      total={data.total}
      page={page}
      limit={limit}
      appliedSearch={search}
    />
  )
}
