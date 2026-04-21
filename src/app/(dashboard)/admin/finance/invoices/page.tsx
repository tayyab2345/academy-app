import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getAdminInvoicesPageData,
  getSingleSearchParam,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { InvoicesPageContent } from "@/components/admin/finance/invoices-page-content"

interface InvoicesPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    search?: string | string[]
    status?: string | string[]
    currency?: string | string[]
  }
}

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
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
  const currency = getSingleSearchParam(searchParams?.currency) || ""

  const data = await getAdminInvoicesPageData({
    academyId: session.user.academyId,
    page,
    limit,
    search,
    status,
    currency,
  })

  return (
    <InvoicesPageContent
      key={`${search}-${status}-${currency}-${page}-${limit}`}
      invoices={data.invoices}
      total={data.total}
      page={page}
      limit={limit}
      appliedSearch={search}
      appliedStatusFilter={status}
      appliedCurrencyFilter={currency}
    />
  )
}
