import Link from "next/link"
import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  Users,
} from "lucide-react"
import { authOptions } from "@/lib/auth"
import {
  calculateAttendanceRate,
  type AttendanceSummaryCounts,
  getParentAttendancePageData,
} from "@/lib/attendance/attendance-portal-data"
import { AttendanceRecordsTable } from "@/components/attendance/attendance-records-table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ParentAttendancePageProps {
  searchParams?: {
    childId?: string
  }
}

const emptySummary: AttendanceSummaryCounts = {
  total: 0,
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  unmarked: 0,
}

export const metadata: Metadata = {
  title: "Attendance - Parent - AcademyFlow",
  description: "Review attendance for your linked children",
}

export default async function ParentAttendancePage({
  searchParams,
}: ParentAttendancePageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "parent") {
    redirect("/login")
  }

  const data = await getParentAttendancePageData({
    userId: session.user.id,
    childId: searchParams?.childId,
  })

  if (!data) {
    redirect("/login")
  }

  const attendanceRate = calculateAttendanceRate(data.summary)
  const childSummaryMap = new Map(
    data.childBreakdown.map((item) => [item.child.id, item.summary])
  )
  const visibleChildren =
    data.selectedChildId !== ""
      ? data.children.filter((child) => child.id === data.selectedChildId)
      : data.children

  if (data.children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Review attendance for your linked children
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No linked children</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Attendance will appear here once a child is linked to your parent
              account.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Review attendance trends and recent records for your children
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/parent/reports">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Children Filter</CardTitle>
          <CardDescription>
            Switch between all linked children or focus on one child
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/parent/attendance">
            <Button variant={data.selectedChildId === "" ? "default" : "outline"}>
              All Children
            </Button>
          </Link>
          {data.children.map((child) => (
            <Link
              key={child.id}
              href={`/parent/attendance?childId=${encodeURIComponent(child.id)}`}
            >
              <Button
                variant={data.selectedChildId === child.id ? "default" : "outline"}
              >
                {child.firstName} {child.lastName}
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <SummaryCard
          title="Attendance Rate"
          value={attendanceRate !== null ? `${attendanceRate}%` : "-"}
        />
        <SummaryCard title="Present" value={data.summary.present} tone="success" />
        <SummaryCard title="Late" value={data.summary.late} tone="warning" />
        <SummaryCard
          title="Late This Week"
          value={data.lateJoinInsights.weekCount}
          tone="warning"
        />
        <SummaryCard
          title="Late This Month"
          value={data.lateJoinInsights.monthCount}
          tone="warning"
        />
        <SummaryCard title="Absent" value={data.summary.absent} tone="danger" />
        <SummaryCard title="Excused" value={data.summary.excused} tone="muted" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Recent Attendance
              </CardTitle>
              <CardDescription>
                Latest attendance records for{" "}
                {data.selectedChildId === "" ? "your children" : "the selected child"}
              </CardDescription>
            </div>
            <span className="text-sm text-muted-foreground">
              {data.summary.total} record{data.summary.total === 1 ? "" : "s"}
            </span>
          </CardHeader>
          <CardContent>
            <AttendanceRecordsTable
              records={data.recentRecords}
              emptyMessage="No attendance records are available yet."
              showStudent={data.selectedChildId === ""}
              showMarkedBy
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Children Summary
            </CardTitle>
            <CardDescription>
              Attendance snapshot for each visible child
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visibleChildren.map((child) => {
                const summary = childSummaryMap.get(child.id) ?? emptySummary
                const childAttendanceRate = calculateAttendanceRate(summary)

                return (
                  <div
                    key={child.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {child.firstName} {child.lastName}
                        </p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {child.studentId}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Present {summary.present}</span>
                          <span>Late {summary.late}</span>
                          <span>Absent {summary.absent}</span>
                          <span>Excused {summary.excused}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          {childAttendanceRate !== null ? `${childAttendanceRate}%` : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {summary.total} record{summary.total === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: number | string
  tone?: "default" | "success" | "warning" | "danger" | "muted"
}

function SummaryCard({
  title,
  value,
  tone = "default",
}: SummaryCardProps) {
  const toneClassName =
    tone === "success"
      ? "bg-green-50 dark:bg-green-950/20"
      : tone === "warning"
        ? "bg-yellow-50 dark:bg-yellow-950/20"
        : tone === "danger"
          ? "bg-red-50 dark:bg-red-950/20"
          : tone === "muted"
            ? "bg-slate-50 dark:bg-slate-900"
            : "bg-muted/20"

  return (
    <Card className={toneClassName}>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
