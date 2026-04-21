import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Clock, DollarSign, FileText, Plus, Settings2 } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { getAdminFinanceDashboardData } from "@/lib/finance/admin-finance-data"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FinanceSummaryCardsEnhanced } from "@/components/finance/finance-summary-cards-enhanced"
import { FinanceActivityFeed } from "@/components/finance/finance-activity-feed"
import { OverdueInvoicesTable } from "@/components/admin/finance/overdue-invoices-table"
import { PendingSubmissionsAlert } from "@/components/admin/finance/pending-submissions-alert"

export const metadata: Metadata = {
  title: "Finance - Admin - AcademyFlow",
  description: "Manage academy finances, invoices, and payments",
}

export default async function AdminFinancePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const financeDashboard = await getAdminFinanceDashboardData(
    session.user.academyId
  )

  const activityItems = [
    ...financeDashboard.recentPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      type: "payment" as const,
      title: `Payment recorded for ${payment.invoice.invoiceNumber}`,
      description: `${payment.invoice.studentProfile.user.firstName} ${payment.invoice.studentProfile.user.lastName} paid ${payment.invoice.currency} ${payment.amount.toFixed(2)}.`,
      occurredAt: payment.createdAt,
      href: `/admin/finance/invoices/${payment.invoice.id}`,
      badge: "Payment",
    })),
    ...financeDashboard.recentSubmissions.map((submission) => ({
      id: `submission-${submission.id}`,
      type:
        submission.status === "approved"
          ? ("approval" as const)
          : submission.status === "rejected"
            ? ("rejection" as const)
            : ("submission" as const),
      title: `Manual payment ${submission.status}`,
      description: `${submission.submittedBy.firstName} ${submission.submittedBy.lastName} submitted ${submission.invoice.currency} ${submission.amount.toFixed(2)} for ${submission.invoice.invoiceNumber}.`,
      occurredAt: submission.createdAt,
      href: `/admin/finance/manual-payments/${submission.id}`,
      badge: submission.status,
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
    )
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Finance Dashboard</h2>
          <p className="text-muted-foreground">
            Track invoices, collections, and manual payment submissions across
            the academy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/payroll">
            <Button variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Payroll
            </Button>
          </Link>
          <Link href="/admin/finance/payment-settings">
            <Button variant="outline">
              <Settings2 className="mr-2 h-4 w-4" />
              Payment Settings
            </Button>
          </Link>
          <Link href="/admin/finance/manual-payments">
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Manual Payments
            </Button>
          </Link>
          <Link href="/admin/finance/fee-plans">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Fee Plans
            </Button>
          </Link>
          <Link href="/admin/finance/invoices/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      <FinanceSummaryCardsEnhanced
        showPendingSubmissions
        summary={financeDashboard.summary}
        summaryByCurrency={financeDashboard.summaryByCurrency}
      />

      <PendingSubmissionsAlert count={financeDashboard.summary.pendingSubmissions} />

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest finance events across payments and manual submissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FinanceActivityFeed
              items={activityItems}
              emptyMessage="No finance activity has been recorded yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common finance management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/finance/manual-payments" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="mr-2 h-4 w-4" />
                Review Manual Payments
              </Button>
            </Link>
            <Link href="/admin/finance/invoices/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Create New Invoice
              </Button>
            </Link>
            <Link href="/admin/finance/fee-plans/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Create Fee Plan
              </Button>
            </Link>
            <Link href="/admin/finance/payment-settings" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Settings2 className="mr-2 h-4 w-4" />
                Update Payment Instructions
              </Button>
            </Link>
            <Link href="/admin/payroll" className="block">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Manage Payroll
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overdue Invoices</CardTitle>
          <CardDescription>
            Focus on the balances that are already past their due date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OverdueInvoicesTable invoices={financeDashboard.overdueInvoices} />
        </CardContent>
      </Card>
    </div>
  )
}
