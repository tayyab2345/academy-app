import Link from "next/link"
import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
} from "lucide-react"
import { authOptions } from "@/lib/auth"
import {
  calculateAttendanceRate,
  getStudentAttendancePageData,
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

export const metadata: Metadata = {
  title: "Attendance - Student - AcademyFlow",
  description: "View your attendance summary and recent records",
}

export default async function StudentAttendancePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/login")
  }

  const data = await getStudentAttendancePageData(session.user.id)

  if (!data) {
    redirect("/login")
  }

  const attendanceRate = calculateAttendanceRate(data.summary)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Review your attendance summary and recent class attendance records
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/student/classes">
            <Button variant="outline">
              <BookOpen className="mr-2 h-4 w-4" />
              My Classes
            </Button>
          </Link>
          <Link href="/student/reports">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Attendance Rate" value={attendanceRate !== null ? `${attendanceRate}%` : "-"} />
        <SummaryCard title="Present" value={data.summary.present} tone="success" />
        <SummaryCard title="Late" value={data.summary.late} tone="warning" />
        <SummaryCard title="Absent" value={data.summary.absent} tone="danger" />
        <SummaryCard title="Excused" value={data.summary.excused} tone="muted" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Recent Attendance
              </CardTitle>
              <CardDescription>
                Your latest attendance records across all classes
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
              showMarkedBy
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Class Breakdown
            </CardTitle>
            <CardDescription>
              Attendance summary by class
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.classBreakdown.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No class attendance has been recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.classBreakdown.map((classItem) => {
                  const classAttendanceRate = calculateAttendanceRate(
                    classItem.summary
                  )

                  return (
                    <Link
                      key={classItem.classId}
                      href="/student/classes"
                      className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {classItem.courseCode}: {classItem.className}
                          </p>
                          {classItem.section ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Section {classItem.section}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>Present {classItem.summary.present}</span>
                            <span>Late {classItem.summary.late}</span>
                            <span>Absent {classItem.summary.absent}</span>
                            <span>Excused {classItem.summary.excused}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            {classAttendanceRate !== null ? `${classAttendanceRate}%` : "-"}
                          </p>
                          <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            View classes
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
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
