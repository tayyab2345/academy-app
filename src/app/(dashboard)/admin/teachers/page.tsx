import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getAdminTeachersPageData,
  getSingleSearchParam,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { TeachersPageContent } from "@/components/admin/teachers/teachers-page-content"

interface TeachersPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    search?: string | string[]
  }
}

export default async function TeachersPage({
  searchParams,
}: TeachersPageProps) {
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

  const data = await getAdminTeachersPageData({
    academyId: session.user.academyId,
    page,
    limit,
    search,
  })

  return (
    <TeachersPageContent
      key={`${search}-${page}-${limit}`}
      teachers={data.teachers}
      total={data.total}
      page={page}
      limit={limit}
      appliedSearch={search}
    />
  )
}
