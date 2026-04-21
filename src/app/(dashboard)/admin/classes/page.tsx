import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getSingleSearchParam,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { getAdminClassesPageData } from "@/lib/admin/admin-lists-data"
import { ClassesPageContent } from "@/components/admin/classes/classes-page-content"

interface ClassesPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    search?: string | string[]
    status?: string | string[]
  }
}

export default async function ClassesPage({
  searchParams,
}: ClassesPageProps) {
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

  const data = await getAdminClassesPageData({
    academyId: session.user.academyId,
    page,
    limit,
    search,
    status,
  })

  return (
    <ClassesPageContent
      key={`${search}-${status}-${page}-${limit}`}
      classes={data.classes}
      total={data.total}
      page={page}
      limit={limit}
      appliedSearch={search}
      appliedStatusFilter={status}
    />
  )
}
