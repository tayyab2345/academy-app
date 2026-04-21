import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getSingleSearchParam,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { getAdminParentsPageData } from "@/lib/admin/admin-lists-data"
import { ParentsPageContent } from "@/components/admin/parents/parents-page-content"

interface ParentsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    search?: string | string[]
  }
}

export default async function ParentsPage({
  searchParams,
}: ParentsPageProps) {
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

  const data = await getAdminParentsPageData({
    academyId: session.user.academyId,
    page,
    limit,
    search,
  })

  return (
    <ParentsPageContent
      key={`${search}-${page}-${limit}`}
      parents={data.parents}
      total={data.total}
      page={page}
      limit={limit}
      appliedSearch={search}
    />
  )
}
