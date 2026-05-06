"use client"

import { User, BookOpen, Clock, Star, Download, Target } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ReportStatusBadge } from "./report-status-badge"
import {
  AttendanceStatusBadge,
  DAY_BASED_REPORT_BUILDER_TYPES,
  DayReportEntry,
  StructuredDayReportData,
} from "@/components/teacher/reports/day-based-report-builder"

interface ReportSection {
  id: string
  sectionType: string
  content: string | null
  contentJson: any
  rating: number | null
  orderIndex: number
}

interface ReportViewerProps {
  report: {
    id: string
    reportType: string
    reportDate: string | Date
    periodStart: string | Date
    periodEnd: string | Date
    status: string
    publishedAt: string | Date | null
    studentProfile: {
      studentId: string
      user: {
        firstName: string
        lastName: string
      }
    }
    class: {
      name: string
      course: {
        code: string
        name: string
      }
    }
    teacherProfile: {
      user: {
        firstName: string
        lastName: string
      }
    }
    sections: ReportSection[]
  }
  showActions?: boolean
  onDownload?: () => void
}

const sectionTypeLabels: Record<string, string> = {
  attendance: "Attendance",
  homework: "Homework Completion",
  strengths: "Strengths",
  improvements: "Areas for Improvement",
  next_focus: "Next Focus",
  teacher_remarks: "Teacher Remarks",
  behavior: "Behavior",
  grades: "Grades",
}

const reportTypeLabels: Record<string, string> = {
  daily: "Daily Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  term: "Term Report",
}

function ReportTextBlock({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm">
        {value?.trim() || "Not added"}
      </p>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone = "muted",
}: {
  label: string
  value: number
  tone?: "muted" | "green" | "yellow" | "red" | "blue"
}) {
  const toneClasses = {
    muted: "bg-muted text-foreground",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  }

  return (
    <div className={`rounded-lg p-3 text-center ${toneClasses[tone]}`}>
      <p className="text-2xl font-bold">{value || 0}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  )
}

function isStructuredDayReportData(value: unknown): value is StructuredDayReportData {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    DAY_BASED_REPORT_BUILDER_TYPES.includes(
      (value as { builderType?: StructuredDayReportData["builderType"] })
        .builderType as StructuredDayReportData["builderType"]
    )
  )
}

export function ReportViewer({
  report,
  showActions = true,
  onDownload,
}: ReportViewerProps) {
  const renderRating = (rating: number | null) => {
    if (!rating) {
      return null
    }

    return (
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    )
  }

  const renderAttendanceSection = (section: ReportSection) => {
    if (!section.contentJson) {
      return (
        <p className="text-muted-foreground">
          {section.content || "No attendance data"}
        </p>
      )
    }

    const data = section.contentJson

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-2xl font-bold">{data.totalSessions || 0}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-950/20">
            <p className="text-2xl font-bold text-green-600">
              {data.present || 0}
            </p>
            <p className="text-xs text-muted-foreground">Present</p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-3 text-center dark:bg-yellow-950/20">
            <p className="text-2xl font-bold text-yellow-600">
              {data.late || 0}
            </p>
            <p className="text-xs text-muted-foreground">Late</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950/20">
            <p className="text-2xl font-bold text-red-600">
              {data.absent || 0}
            </p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </div>
        </div>
        {section.content && (
          <p className="mt-3 text-sm text-muted-foreground">
            {section.content}
          </p>
        )}
      </div>
    )
  }

  const renderGradesSection = (section: ReportSection) => {
    if (!section.contentJson?.grades) {
      return (
        <p className="text-muted-foreground">
          {section.content || "No grades recorded"}
        </p>
      )
    }

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          {section.contentJson.grades.map((grade: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between rounded border p-2"
            >
              <span className="font-medium">{grade.subject}</span>
              <span className="rounded border px-2 py-0.5 text-xs">
                {grade.grade}
              </span>
            </div>
          ))}
        </div>
        {section.content && (
          <p className="text-sm text-muted-foreground">{section.content}</p>
        )}
      </div>
    )
  }

  const renderDailyEntry = (entry: DayReportEntry) => {
    const summary =
      entry.taughtToday?.trim() ||
      entry.homework?.trim() ||
      entry.performance?.trim() ||
      entry.teacherNote?.trim() ||
      "No daily notes added"

    return (
      <details
        key={entry.date}
        className="group overflow-hidden rounded-xl border bg-muted/10"
      >
        <summary className="flex cursor-pointer list-none flex-col gap-2 p-3 transition hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{entry.dayName || "Day"}</p>
              <span className="text-xs text-muted-foreground">
                {entry.date
                  ? new Date(`${entry.date}T00:00:00`).toLocaleDateString()
                  : "No date"}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {summary}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <AttendanceStatusBadge attendance={entry.attendance} />
            <span className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <span className="group-open:hidden">Expand</span>
              <span className="hidden group-open:inline">Hide</span>
            </span>
          </div>
        </summary>
        <div className="grid gap-3 border-t bg-background p-3 text-sm md:grid-cols-2">
          <ReportTextBlock label="What was taught" value={entry.taughtToday} />
          <ReportTextBlock label="Homework / lesson work" value={entry.homework} />
          <ReportTextBlock label="Student performance" value={entry.performance} />
          <ReportTextBlock label="Behavior / participation" value={entry.behavior} />
          <div className="md:col-span-2">
            <ReportTextBlock label="Teacher note" value={entry.teacherNote} />
          </div>
        </div>
      </details>
    )
  }

  const renderDayBasedReportSection = (section: ReportSection) => {
    const data = section.contentJson as StructuredDayReportData
    const dailyEntries = Array.isArray(data.dailyEntries) ? data.dailyEntries : []
    const monthlyWeeklySummaries = Array.isArray(data.monthlyWeeklySummaries)
      ? data.monthlyWeeklySummaries
      : []
    const monthlySummary: Partial<StructuredDayReportData["monthlySummary"]> =
      data.monthlySummary ?? {}
    const nextWeekFocus: Partial<StructuredDayReportData["nextWeekFocus"]> =
      data.nextWeekFocus ?? {}

    return (
      <div className="space-y-4">
        {data.attendanceSummary && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <SummaryStat label="Sessions" value={data.attendanceSummary.totalSessions} />
            <SummaryStat label="Present" value={data.attendanceSummary.present} tone="green" />
            <SummaryStat label="Late" value={data.attendanceSummary.late} tone="yellow" />
            <SummaryStat label="Absent" value={data.attendanceSummary.absent} tone="red" />
            <SummaryStat label="Excused" value={data.attendanceSummary.excused} tone="blue" />
          </div>
        )}

        {data.reportType === "monthly" && (
          <div className="grid gap-3 md:grid-cols-2">
            <ReportTextBlock
              label="Lessons covered"
              value={monthlySummary.lessonsCovered}
            />
            <ReportTextBlock
              label="Homework completion"
              value={monthlySummary.homeworkCompletion}
            />
            <ReportTextBlock label="Strengths" value={monthlySummary.strengths} />
            <ReportTextBlock
              label="Areas for improvement"
              value={monthlySummary.areasForImprovement}
            />
            <ReportTextBlock
              label="Next month focus"
              value={monthlySummary.nextMonthFocus}
            />
            <ReportTextBlock
              label="Teacher remarks"
              value={monthlySummary.teacherRemarks}
            />
          </div>
        )}

        {data.reportType === "monthly" &&
          monthlyWeeklySummaries.some((week) => week.summary?.trim()) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Weekly summaries</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {monthlyWeeklySummaries
                  .filter((week) => week.summary?.trim())
                  .map((week) => (
                    <ReportTextBlock
                      key={week.id}
                      label={`${week.label}: ${week.periodStart} - ${week.periodEnd}`}
                      value={week.summary}
                    />
                  ))}
              </div>
            </div>
          )}

        {dailyEntries.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Daily entries</h4>
            <div className="grid gap-2 xl:grid-cols-2">
              {dailyEntries.map(renderDailyEntry)}
            </div>
          </div>
        )}

        {data.reportType === "weekly" && (
          <div className="rounded-lg border bg-muted/20 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-emerald-600" />
              Next week focus
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <ReportTextBlock
                label="What will be taught"
                value={nextWeekFocus.whatWillBeTaught}
              />
              <ReportTextBlock
                label="Areas to improve"
                value={nextWeekFocus.areasToImprove}
              />
              <ReportTextBlock
                label="Homework / follow-up"
                value={nextWeekFocus.homeworkFollowUp}
              />
              <ReportTextBlock
                label="Teacher remarks"
                value={nextWeekFocus.teacherRemarks}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSection = (section: ReportSection) => {
    if (isStructuredDayReportData(section.contentJson)) {
      return renderDayBasedReportSection(section)
    }

    if (section.sectionType === "attendance") {
      return renderAttendanceSection(section)
    }

    if (section.sectionType === "grades") {
      return renderGradesSection(section)
    }

    return (
      <>
        <p className="whitespace-pre-wrap">{section.content || "No comments"}</p>
        {renderRating(section.rating)}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">
                  {reportTypeLabels[report.reportType] || report.reportType}
                </CardTitle>
                <ReportStatusBadge status={report.status as any} />
              </div>
              <CardDescription className="mt-2">
                Generated on {new Date(report.reportDate).toLocaleDateString()}
                {report.publishedAt && (
                  <>
                    {" "}
                    | Published{" "}
                    {new Date(report.publishedAt).toLocaleDateString()}
                  </>
                )}
              </CardDescription>
            </div>
            {showActions && onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">Student:</span>{" "}
                {report.studentProfile.user.firstName}{" "}
                {report.studentProfile.user.lastName}
                <span className="ml-1 text-muted-foreground">
                  ({report.studentProfile.studentId})
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">Class:</span>{" "}
                {report.class.course.code}: {report.class.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">Teacher:</span>{" "}
                {report.teacherProfile.user.firstName}{" "}
                {report.teacherProfile.user.lastName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">Period:</span>{" "}
                {new Date(report.periodStart).toLocaleDateString()} -{" "}
                {new Date(report.periodEnd).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {report.sections.length > 0 && (
        <div className="space-y-4">
          {report.sections
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((section) => (
              <Card key={section.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {isStructuredDayReportData(section.contentJson)
                      ? section.contentJson.reportType === "weekly"
                        ? "Weekly Day-Based Report"
                        : "Monthly Report Builder"
                      : sectionTypeLabels[section.sectionType] ||
                        section.sectionType}
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderSection(section)}</CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
