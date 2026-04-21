import Link from "next/link"
import { getServerSession } from "next-auth"
import { unstable_cache } from "next/cache"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  Bell,
  DollarSign,
  FileText,
  MessageSquare,
  Receipt,
  Users,
} from "lucide-react"
import { authOptions } from "@/lib/auth"
import { calculateOutstandingAmount } from "@/lib/invoice-utils"
import { prisma } from "@/lib/prisma"
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"
import { CourseSyllabusPanel } from "@/components/courses/course-syllabus-panel"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

async function getParentDashboardCoreData(userId: string) {
  return unstable_cache(
    async () => {
      const parentProfile = await prisma.parentProfile.findUnique({
        where: { userId },
        select: { id: true },
      })

      if (!parentProfile) {
        return null
      }

      const linkedChildren = await prisma.parentStudentLink.findMany({
        where: { parentProfileId: parentProfile.id },
        include: {
          studentProfile: {
            select: {
              id: true,
              studentId: true,
              gradeLevel: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      })

      const childIds = linkedChildren.map((link) => link.studentProfile.id)
      const now = new Date()

      if (childIds.length === 0) {
        return {
          linkedChildren,
          activeEnrollments: [],
          recentReports: [],
          publishedReportsCount: 0,
          reportsByChild: [],
          invoices: [],
          now: now.toISOString(),
        }
      }

      const [
        activeEnrollments,
        recentReports,
        publishedReportsCount,
        reportsByChild,
        invoices,
      ] = await Promise.all([
        prisma.enrollment.findMany({
          where: {
            studentProfileId: { in: childIds },
            status: "active",
          },
          include: {
            class: {
              select: {
                id: true,
                name: true,
                section: true,
                scheduleDays: true,
                scheduleStartTime: true,
                scheduleEndTime: true,
                scheduleRecurrence: true,
                course: {
                  select: {
                    code: true,
                    name: true,
                    syllabusPdfUrl: true,
                    syllabusImageUrl: true,
                  },
                },
                teachers: {
                  where: {
                    role: "primary",
                  },
                  select: {
                    teacherProfile: {
                      select: {
                        user: {
                          select: {
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
                  },
                  take: 1,
                },
              },
            },
            studentProfile: {
              select: {
                id: true,
              },
            },
          },
        }),
        prisma.report.findMany({
          where: {
            studentProfileId: { in: childIds },
            status: "published",
          },
          select: {
            id: true,
            reportType: true,
            reportDate: true,
            publishedAt: true,
            status: true,
            studentProfile: {
              select: {
                id: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                course: {
                  select: {
                    code: true,
                  },
                },
              },
            },
            teacherProfile: {
              select: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            publishedAt: "desc",
          },
          take: 4,
        }),
        prisma.report.count({
          where: {
            studentProfileId: { in: childIds },
            status: "published",
          },
        }),
        prisma.report.groupBy({
          by: ["studentProfileId"],
          where: {
            studentProfileId: { in: childIds },
            status: "published",
          },
          _count: {
            _all: true,
          },
        }),
        prisma.invoice.findMany({
          where: {
            studentProfileId: { in: childIds },
            status: { not: "draft" },
          },
          include: {
            studentProfile: {
              select: {
                id: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                course: {
                  select: {
                    code: true,
                  },
                },
              },
            },
            payments: {
              where: { status: "completed" },
              include: {
                recordedBy: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            adjustments: true,
            manualPaymentSubmissions: {
              where: {
                submittedByUserId: userId,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
          orderBy: {
            dueDate: "asc",
          },
        }),
      ])

      return {
        linkedChildren,
        activeEnrollments,
        recentReports,
        publishedReportsCount,
        reportsByChild,
        invoices,
        now: now.toISOString(),
      }
    },
    ["parent-dashboard-core", userId],
    {
      revalidate: 60,
    }
  )()
}
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge"
import { PaymentSubmissionStatusBadge } from "@/components/finance/payment-submission-status-badge"
import { ReportStatusBadge } from "@/components/reports/report-status-badge"

function buildCurrencyTotals(rows: Array<{ currency: string; amount: number }>) {
  const totals = new Map<string, number>()

  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) || 0) + row.amount)
  }

  return Array.from(totals.entries()).map(([currency, amount]) => ({
    currency,
    amount,
  }))
}

function formatRelativeDate(date: Date | string | null | undefined, now: Date) {
  if (!date) return "-"

  const safeDate = new Date(date)

  if (Number.isNaN(safeDate.getTime())) return "invalid date"

  const diffMs = now.getTime() - safeDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day ago`
}

function renderCurrencyTotals(
  totals: Array<{
    currency: string
    amount: number
  }>
) {
  if (totals.length === 0) {
    return <span className="text-2xl font-bold">None</span>
  }

  if (totals.length === 1) {
    const [total] = totals
    return (
      <CurrencyAmount
        amount={total.amount}
        currency={total.currency}
        className="text-2xl font-bold"
      />
    )
  }

  return (
    <div className="space-y-1">
      {totals.map((total) => (
        <div key={total.currency} className="text-sm font-semibold">
          <CurrencyAmount amount={total.amount} currency={total.currency} />
        </div>
      ))}
    </div>
  )
}

export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "parent") {
    redirect("/login")
  }

  const dashboardData = await getParentDashboardCoreData(session.user.id)

  if (!dashboardData) {
    redirect("/login")
  }
  const {
    linkedChildren,
    activeEnrollments,
    recentReports,
    publishedReportsCount,
    reportsByChild,
    invoices,
    now: cachedNow,
  } = dashboardData
  const now = new Date(cachedNow)
  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      message: true,
      isRead: true,
      actionUrl: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  })

  const reportCountByChild = new Map(
    reportsByChild.map((group) => [group.studentProfileId, group._count._all])
  )

  const activeClassCountByChild = activeEnrollments.reduce((map, enrollment) => {
    map.set(
      enrollment.studentProfile.id,
      (map.get(enrollment.studentProfile.id) || 0) + 1
    )

    return map
  }, new Map<string, number>())

  const invoiceSnapshots = invoices.map((invoice) => {
    const paidAmount = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    )
    const outstanding = calculateOutstandingAmount(
      Number(invoice.totalAmount),
      paidAmount,
      invoice.adjustments.map((adjustment) => ({
        type: adjustment.type,
        amount: Number(adjustment.amount),
      }))
    )

    return {
      ...invoice,
      paidAmount,
      outstanding,
      latestSubmission: invoice.manualPaymentSubmissions[0] || null,
    }
  })

  const outstandingByCurrency = buildCurrencyTotals(
    invoiceSnapshots.flatMap((invoice) =>
      invoice.outstanding > 0
        ? [{ currency: invoice.currency, amount: invoice.outstanding }]
        : []
    )
  )

  const outstandingInvoices = invoiceSnapshots.filter(
    (invoice) => invoice.outstanding > 0
  )
  const recentPayments = invoiceSnapshots
    .flatMap((invoice) =>
      invoice.payments.map((payment) => ({
        id: payment.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        currency: payment.currency,
        amount: Number(payment.amount),
        paymentDate: payment.paymentDate,
        childName: `${invoice.studentProfile.user.firstName} ${invoice.studentProfile.user.lastName}`,
        recordedBy: payment.recordedBy,
      }))
    )
    .sort(
      (left, right) =>
        new Date(right.paymentDate).getTime() - new Date(left.paymentDate).getTime()
    )
    .slice(0, 4)

  const pendingProofReviews = invoiceSnapshots.reduce((count, invoice) => {
    return count + (invoice.latestSubmission?.status === "pending" ? 1 : 0)
  }, 0)
  const overdueInvoices = outstandingInvoices.filter(
    (invoice) =>
      invoice.status !== "waived" && new Date(invoice.dueDate).getTime() < now.getTime()
  )
  const pendingItemsCount = outstandingInvoices.length + pendingProofReviews
  const unreadNotifications = notifications.filter(
    (notification) => !notification.isRead
  ).length
  const academyPrimaryColor = session.user.academy?.primaryColor || "#059669"

  const childOutstandingTotals = linkedChildren.reduce((map, link) => {
    const totals = buildCurrencyTotals(
      invoiceSnapshots.flatMap((invoice) =>
        invoice.studentProfile.id === link.studentProfile.id && invoice.outstanding > 0
          ? [{ currency: invoice.currency, amount: invoice.outstanding }]
          : []
      )
    )

    map.set(link.studentProfile.id, totals)
    return map
  }, new Map<string, Array<{ currency: string; amount: number }>>())

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg border p-6"
        style={{
          background: `linear-gradient(135deg, ${academyPrimaryColor}10 0%, transparent 100%)`,
          borderColor: `${academyPrimaryColor}30`,
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {session.user.firstName}!
            </h2>
            <p className="mt-2 text-muted-foreground">
              {linkedChildren.length > 0
                ? `You are linked to ${linkedChildren.length} child${linkedChildren.length === 1 ? "" : "ren"}. Here is your live overview of reports, invoices, submitted payments, and notifications.`
                : "You do not have any linked children yet. Once your academy links a child to your account, reports, billing updates, and notifications will appear here."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/parent/reports">
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Children&apos;s Reports
              </Button>
            </Link>
            <Link href="/parent/finance">
              <Button variant="outline">
                <DollarSign className="mr-2 h-4 w-4" />
                Finance
              </Button>
            </Link>
            <Link href="/notifications">
              <Button variant="outline">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Children"
          value={<span className="text-2xl font-bold">{linkedChildren.length}</span>}
          description="Linked children on your account"
        />
        <StatCard
          title="Reports"
          value={<span className="text-2xl font-bold">{publishedReportsCount}</span>}
          description={
            recentReports[0]?.publishedAt
              ? `Latest report published ${new Date(recentReports[0].publishedAt).toLocaleDateString()}`
              : "No published reports available yet"
          }
        />
        <StatCard
          title="Outstanding Fees"
          value={renderCurrencyTotals(outstandingByCurrency)}
          description={
            outstandingInvoices.length > 0
              ? `${outstandingInvoices.length} invoice${outstandingInvoices.length === 1 ? "" : "s"} still need payment`
              : "No outstanding balances right now"
          }
        />
        <StatCard
          title="Pending Items"
          value={<span className="text-2xl font-bold">{pendingItemsCount}</span>}
          description={
            pendingItemsCount > 0
              ? `${overdueInvoices.length} overdue, ${pendingProofReviews} submitted payment${pendingProofReviews === 1 ? "" : "s"} awaiting review`
              : "No pending finance items right now"
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Linked Children</CardTitle>
              <CardDescription>
                Student summaries for your linked children
              </CardDescription>
            </div>
            <Link href="/parent/reports">
              <Button variant="ghost" size="sm">
                View reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {linkedChildren.length === 0 ? (
              <DashboardEmptyState
                icon={Users}
                title="No linked children yet"
                description="Your academy admin can link one or more students to your account. Once linked, their reports and invoices will appear here."
              />
            ) : (
              <div className="space-y-3">
                {linkedChildren.map((link) => {
                  const student = link.studentProfile
                  const outstandingTotals =
                    childOutstandingTotals.get(student.id) || []

                  return (
                    <div
                      key={student.id}
                      className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {student.user.firstName} {student.user.lastName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {student.studentId} • {student.gradeLevel}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">
                              {activeClassCountByChild.get(student.id) || 0} active class
                              {activeClassCountByChild.get(student.id) === 1 ? "" : "es"}
                            </Badge>
                            <Badge variant="outline">
                              {reportCountByChild.get(student.id) || 0} published report
                              {(reportCountByChild.get(student.id) || 0) === 1 ? "" : "s"}
                            </Badge>
                          </div>
                          <div className="mt-4 space-y-3">
                            {activeEnrollments
                              .filter((enrollment) => enrollment.studentProfile.id === student.id)
                              .map((enrollment) => {
                                const teacher =
                                  enrollment.class.teachers[0]?.teacherProfile.user

                                return (
                                  <div
                                    key={enrollment.class.id}
                                    className="rounded-md bg-muted/20 p-3"
                                  >
                                    <p className="text-sm font-medium">
                                      {enrollment.class.course.code}: {enrollment.class.name}
                                      {enrollment.class.section
                                        ? ` (Section ${enrollment.class.section})`
                                        : ""}
                                    </p>
                                    <div className="mt-2">
                                      <ClassScheduleSummary
                                        scheduleDays={enrollment.class.scheduleDays}
                                        scheduleStartTime={enrollment.class.scheduleStartTime}
                                        scheduleEndTime={enrollment.class.scheduleEndTime}
                                        scheduleRecurrence={enrollment.class.scheduleRecurrence}
                                        teacherName={
                                          teacher
                                            ? `${teacher.firstName} ${teacher.lastName}`
                                            : null
                                        }
                                        emptyMessage="No recurring schedule has been configured yet."
                                      />
                                    </div>
                                    <div className="mt-3">
                                      <CourseSyllabusPanel
                                        courseName={enrollment.class.course.name}
                                        syllabusPdfUrl={enrollment.class.course.syllabusPdfUrl}
                                        syllabusImageUrl={enrollment.class.course.syllabusImageUrl}
                                        title="Syllabus"
                                        description="Preview the course outline and downloadable syllabus."
                                        emptyMessage="No syllabus uploaded for this course yet."
                                        variant="inline"
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Outstanding</p>
                          {outstandingTotals.length > 0 ? (
                            <div className="mt-1">{renderCurrencyTotals(outstandingTotals)}</div>
                          ) : (
                            <p className="mt-1 text-sm font-semibold text-green-600">
                              All paid
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Latest published reports across your linked children
              </CardDescription>
            </div>
            <Link href="/parent/reports">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <DashboardEmptyState
                icon={FileText}
                title="No reports available yet"
                description="Published reports from your children&apos;s teachers will show here when they are ready."
              />
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/parent/reports/${report.id}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {report.studentProfile.user.firstName}{" "}
                            {report.studentProfile.user.lastName}
                          </p>
                          <ReportStatusBadge status={report.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {report.class.course.code}: {report.class.name}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Teacher: {report.teacherProfile.user.firstName}{" "}
                          {report.teacherProfile.user.lastName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.reportDate).toLocaleDateString()}
                        </p>
                        <ArrowRight className="ml-auto mt-2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Outstanding Invoices</CardTitle>
              <CardDescription>
                Open balances that still need action
              </CardDescription>
            </div>
            <Link href="/parent/finance">
              <Button variant="ghost" size="sm">
                View finance
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {outstandingInvoices.length === 0 ? (
              <DashboardEmptyState
                icon={Receipt}
                title="No outstanding invoices"
                description="You are all caught up right now. New invoices will appear here when the academy issues them."
              />
            ) : (
              <div className="space-y-3">
                {outstandingInvoices.slice(0, 4).map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/parent/finance/invoices/${invoice.id}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-sm">{invoice.invoiceNumber}</p>
                          <InvoiceStatusBadge status={invoice.status} />
                          {invoice.latestSubmission ? (
                            <PaymentSubmissionStatusBadge
                              status={invoice.latestSubmission.status}
                            />
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm font-medium">
                          {invoice.studentProfile.user.firstName}{" "}
                          {invoice.studentProfile.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <CurrencyAmount
                          amount={invoice.outstanding}
                          currency={invoice.currency}
                          className="font-medium text-red-600"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>
                Latest payment activity across all linked children
              </CardDescription>
            </div>
            <Link href="/parent/finance">
              <Button variant="ghost" size="sm">
                View finance
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <DashboardEmptyState
                icon={DollarSign}
                title="No payments recorded yet"
                description="When a payment is recorded on one of your children&apos;s invoices, it will appear here."
              />
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <Link
                    key={payment.id}
                    href={`/parent/finance/invoices/${payment.invoiceId}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{payment.childName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Invoice {payment.invoiceNumber}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Recorded by {payment.recordedBy.firstName}{" "}
                          {payment.recordedBy.lastName}
                        </p>
                      </div>
                      <div className="text-right">
                        <CurrencyAmount
                          amount={payment.amount}
                          currency={payment.currency}
                          className="font-medium text-green-600"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>
                {unreadNotifications} unread notification
                {unreadNotifications === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <Link href="/notifications">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <DashboardEmptyState
                icon={Bell}
                title="No notifications yet"
                description="Invoice alerts, report updates, and announcements will appear here."
              />
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.actionUrl || "/notifications"}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {notification.title}
                          </p>
                          <Badge variant={notification.isRead ? "outline" : "default"}>
                            {notification.isRead ? "Read" : "Unread"}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeDate(notification.createdAt, now)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Jump to the parent features you use most
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <QuickActionButton
              href="/parent/reports"
              icon={FileText}
              title="Children's Reports"
              description="Review published reports for your linked children"
            />
            <QuickActionButton
              href="/parent/finance"
              icon={DollarSign}
              title="Finance"
              description="Track invoices, submitted proofs, and payment history"
            />
            <QuickActionButton
              href="/parent/posts"
              icon={MessageSquare}
              title="Announcements"
              description="Read academy and class announcements"
            />
            <QuickActionButton
              href="/notifications"
              icon={Bell}
              title="Notifications"
              description="Open your latest updates and reminders"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: React.ReactNode
  description: string
}

function StatCard({ title, value, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {value}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

interface DashboardEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

function DashboardEmptyState({
  icon: Icon,
  title,
  description,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
      <Icon className="mb-4 h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

interface QuickActionButtonProps {
  href: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

function QuickActionButton({
  href,
  title,
  description,
  icon: Icon,
}: QuickActionButtonProps) {
  return (
    <Link href={href}>
      <div className="rounded-lg border p-4 transition-colors hover:bg-muted/40">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
