import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getManualPaymentsList } from "@/lib/manual-payments-data"
import { ManualPaymentsTable } from "@/components/finance/manual-payments-table"
import { ManualPaymentsStatsCards } from "@/components/admin/finance/manual-payments-stats-cards"
import { PendingSubmissionsAlert } from "@/components/admin/finance/pending-submissions-alert"

const allowedStatuses = new Set(["pending", "approved", "rejected"])

interface ManualPaymentsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
    status?: string | string[]
    invoiceId?: string | string[]
  }
}

export const metadata: Metadata = {
  title: "Manual Payments - Admin - AcademyFlow",
}

function getSingleSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminManualPaymentsPage({
  searchParams,
}: ManualPaymentsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const page = Number.parseInt(getSingleSearchParam(searchParams?.page) || "1", 10)
  const limit = Number.parseInt(
    getSingleSearchParam(searchParams?.limit) || "10",
    10
  )
  const status = getSingleSearchParam(searchParams?.status) || ""
  const invoiceId = getSingleSearchParam(searchParams?.invoiceId) || ""

  const data = await getManualPaymentsList({
    academyId: session.user.academyId,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
    status: allowedStatuses.has(status) ? status : undefined,
    invoiceId: invoiceId || undefined,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Manual Payments</h2>
        <p className="text-muted-foreground">
          Review receipt submissions and convert verified proofs into official
          payments.
        </p>
      </div>

      <PendingSubmissionsAlert count={data.stats.pending} />

      <ManualPaymentsStatsCards stats={data.stats} />

      <ManualPaymentsTable
        submissions={data.submissions.map((submission) => ({
          id: submission.id,
          invoiceId: submission.invoiceId,
          invoiceNumber: submission.invoice.invoiceNumber,
          studentName: `${submission.invoice.studentProfile.user.firstName} ${submission.invoice.studentProfile.user.lastName}`,
          submittedByName: `${submission.submittedBy.firstName} ${submission.submittedBy.lastName}`,
          submittedByRole: submission.submittedBy.role,
          amount: Number(submission.amount),
          currency: submission.invoice.currency,
          paymentMethod: submission.paymentMethod,
          status: submission.status,
          createdAt: submission.createdAt.toISOString(),
          reviewedAt: submission.reviewedAt?.toISOString() || null,
        }))}
        total={data.total}
        pendingCount={data.pendingCount}
        page={data.page}
        limit={limit}
        appliedStatusFilter={allowedStatuses.has(status) ? status : ""}
        appliedInvoiceIdFilter={invoiceId}
      />
    </div>
  )
}
