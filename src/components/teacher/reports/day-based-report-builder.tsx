"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  MessageSquare,
  Target,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ReportSection } from "./report-sections-editor"

export const DAY_BASED_REPORT_BUILDER_TYPES = [
  "weekly_day_builder",
  "monthly_day_builder",
] as const

export type DayBasedReportBuilderType =
  (typeof DAY_BASED_REPORT_BUILDER_TYPES)[number]

export type AttendanceStatusValue =
  | "present"
  | "late"
  | "absent"
  | "excused"
  | "no_record"

export interface ReportAttendanceSession {
  id: string
  title: string | null
  date: string
  dayName: string
  startTime: string | null
  endTime: string | null
  sessionStatus: string
  attendance: {
    id: string
    status: AttendanceStatusValue
    lateMinutes: number | null
    notes: string | null
    joinTime: string | null
  } | null
}

export interface DailyReportSnapshotSection {
  id: string
  sectionType: string
  content: string | null
  contentJson: unknown
  rating: number | null
  orderIndex: number
}

export interface DailyReportSnapshot {
  id: string
  date: string
  reportDate: string
  updatedAt: string
  sections: DailyReportSnapshotSection[]
}

export interface ReportAttendanceContext {
  totalSessions: number
  present: number
  absent: number
  late: number
  excused: number
  sessions: ReportAttendanceSession[]
  dailyReports?: DailyReportSnapshot[]
}

export interface DayReportAttendanceSnapshot {
  status: AttendanceStatusValue
  label: string
  lateMinutes: number | null
  notes: string | null
  sessionCount: number
  startTime: string | null
  endTime: string | null
}

export interface DayReportEntry {
  date: string
  dayName: string
  attendance: DayReportAttendanceSnapshot | null
  taughtToday: string
  homework: string
  performance: string
  behavior: string
  teacherNote: string
  sourceDailyReportId?: string | null
  sourceDailyReportUpdatedAt?: string | null
}

export interface WeeklyFocus {
  whatWillBeTaught: string
  areasToImprove: string
  homeworkFollowUp: string
  teacherRemarks: string
}

export interface MonthlySummary {
  lessonsCovered: string
  homeworkCompletion: string
  strengths: string
  areasForImprovement: string
  nextMonthFocus: string
  teacherRemarks: string
}

export interface MonthlyWeeklySummary {
  id: string
  label: string
  periodStart: string
  periodEnd: string
  summary: string
}

export interface StructuredDayReportData {
  version: 1
  builderType: DayBasedReportBuilderType
  reportType: "weekly" | "monthly"
  selectedDays: string[]
  attendanceSummary: ReportAttendanceContext | null
  dailyEntries: DayReportEntry[]
  nextWeekFocus: WeeklyFocus
  monthlySummary: MonthlySummary
  monthlyWeeklySummaries: MonthlyWeeklySummary[]
}

interface DayBasedReportBuilderProps {
  reportType: "weekly" | "monthly"
  periodStart: string
  periodEnd: string
  classId: string
  studentProfileId: string
  value: StructuredDayReportData
  attendanceContext: ReportAttendanceContext | null
  isLoadingAttendance: boolean
  onChange: (value: StructuredDayReportData) => void
  disabled?: boolean
}

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" })
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
})

const emptyWeeklyFocus: WeeklyFocus = {
  whatWillBeTaught: "",
  areasToImprove: "",
  homeworkFollowUp: "",
  teacherRemarks: "",
}

const emptyMonthlySummary: MonthlySummary = {
  lessonsCovered: "",
  homeworkCompletion: "",
  strengths: "",
  areasForImprovement: "",
  nextMonthFocus: "",
  teacherRemarks: "",
}

export function isDayBasedReportSection(section: Pick<ReportSection, "contentJson">) {
  const contentJson = section.contentJson

  return (
    Boolean(contentJson) &&
    typeof contentJson === "object" &&
    !Array.isArray(contentJson) &&
    DAY_BASED_REPORT_BUILDER_TYPES.includes(
      (contentJson as { builderType?: DayBasedReportBuilderType }).builderType as DayBasedReportBuilderType
    )
  )
}

export function createDefaultDayBasedReportData(
  reportType: "weekly" | "monthly",
  initial?: unknown
): StructuredDayReportData {
  if (
    initial &&
    typeof initial === "object" &&
    !Array.isArray(initial) &&
    DAY_BASED_REPORT_BUILDER_TYPES.includes(
      (initial as { builderType?: DayBasedReportBuilderType }).builderType as DayBasedReportBuilderType
    )
  ) {
    const source = initial as Partial<StructuredDayReportData>

    return {
      version: 1,
      builderType:
        source.builderType ??
        (reportType === "weekly" ? "weekly_day_builder" : "monthly_day_builder"),
      reportType,
      selectedDays: Array.isArray(source.selectedDays) ? source.selectedDays : [],
      attendanceSummary: source.attendanceSummary ?? null,
      dailyEntries: Array.isArray(source.dailyEntries)
        ? source.dailyEntries.map(normalizeDailyEntry)
        : [],
      nextWeekFocus: {
        ...emptyWeeklyFocus,
        ...(source.nextWeekFocus ?? {}),
      },
      monthlySummary: {
        ...emptyMonthlySummary,
        ...(source.monthlySummary ?? {}),
      },
      monthlyWeeklySummaries: Array.isArray(source.monthlyWeeklySummaries)
        ? source.monthlyWeeklySummaries.map((summary, index) => ({
            id: summary.id || `week-${index + 1}`,
            label: summary.label || `Week ${index + 1}`,
            periodStart: summary.periodStart || "",
            periodEnd: summary.periodEnd || "",
            summary: summary.summary || "",
          }))
        : [],
    }
  }

  return {
    version: 1,
    builderType:
      reportType === "weekly" ? "weekly_day_builder" : "monthly_day_builder",
    reportType,
    selectedDays: [],
    attendanceSummary: null,
    dailyEntries: [],
    nextWeekFocus: { ...emptyWeeklyFocus },
    monthlySummary: { ...emptyMonthlySummary },
    monthlyWeeklySummaries: [],
  }
}

export function buildDayBasedReportSection(
  reportType: "weekly" | "monthly",
  data: StructuredDayReportData,
  attendanceContext: ReportAttendanceContext | null
): ReportSection {
  const normalizedData: StructuredDayReportData = {
    ...data,
    builderType:
      reportType === "weekly" ? "weekly_day_builder" : "monthly_day_builder",
    reportType,
    attendanceSummary: attendanceContext ?? data.attendanceSummary,
  }

  return {
    sectionType: "teacher_remarks",
    content:
      reportType === "weekly"
        ? "Weekly day-by-day progress report"
        : "Monthly progress report builder",
    contentJson: normalizedData,
    rating: null,
    orderIndex: 0,
  }
}

export function getDefaultReportPeriod(reportType: "weekly" | "monthly") {
  const today = new Date()

  if (reportType === "monthly") {
    return {
      start: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      end: formatDateInput(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    }
  }

  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: formatDateInput(monday),
    end: formatDateInput(sunday),
  }
}

export function DayBasedReportBuilder({
  reportType,
  periodStart,
  periodEnd,
  classId,
  studentProfileId,
  value,
  attendanceContext,
  isLoadingAttendance,
  onChange,
  disabled = false,
}: DayBasedReportBuilderProps) {
  const dateOptions = useMemo(
    () => getDatesInRange(periodStart, periodEnd, reportType === "monthly" ? 45 : 14),
    [periodEnd, periodStart, reportType]
  )

  const monthlyWeeks = useMemo(
    () => buildWeeklySummaryBlocks(periodStart, periodEnd),
    [periodEnd, periodStart]
  )

  useEffect(() => {
    const allowedDates = new Set(dateOptions.map((option) => option.date))
    const selectedInRange = value.selectedDays.filter((date) =>
      allowedDates.has(date)
    )
    const shouldAutoSelectWeekly =
      reportType === "weekly" &&
      selectedInRange.length === 0 &&
      dateOptions.length > 0
    const nextSelectedDays = shouldAutoSelectWeekly
      ? dateOptions.map((option) => option.date)
      : selectedInRange

    if (
      nextSelectedDays.length !== value.selectedDays.length ||
      nextSelectedDays.some((date, index) => date !== value.selectedDays[index]) ||
      value.reportType !== reportType ||
      value.builderType !==
        (reportType === "weekly" ? "weekly_day_builder" : "monthly_day_builder")
    ) {
      onChange({
        ...value,
        reportType,
        builderType:
          reportType === "weekly" ? "weekly_day_builder" : "monthly_day_builder",
        selectedDays: nextSelectedDays,
      })
    }
  }, [dateOptions, onChange, reportType, value])

  useEffect(() => {
    const existingEntries = new Map(
      value.dailyEntries.map((entry) => [entry.date, entry])
    )
    const nextEntries = value.selectedDays.map((date) => {
      const existingEntry = existingEntries.get(date)
      const dailyReport = resolveDailyReportForDate(attendanceContext, date)
      const shouldHydrateFromDailyReport =
        dailyReport &&
        (existingEntry?.sourceDailyReportId !== dailyReport.id ||
          existingEntry?.sourceDailyReportUpdatedAt !== dailyReport.updatedAt)

      return normalizeDailyEntry({
        ...existingEntry,
        ...(shouldHydrateFromDailyReport
          ? buildEntryFromDailyReport(dailyReport)
          : {}),
        date,
        dayName: getDayName(date),
        attendance: resolveAttendanceForDate(attendanceContext, date),
      })
    })

    const nextWeeklySummaries =
      reportType === "monthly"
        ? monthlyWeeks.map((week) => {
            const existing = value.monthlyWeeklySummaries.find(
              (summary) => summary.id === week.id
            )

            return {
              ...week,
              summary: existing?.summary ?? "",
            }
          })
        : value.monthlyWeeklySummaries

    if (
      JSON.stringify(nextEntries) !== JSON.stringify(value.dailyEntries) ||
      JSON.stringify(nextWeeklySummaries) !==
        JSON.stringify(value.monthlyWeeklySummaries) ||
      JSON.stringify(attendanceContext) !== JSON.stringify(value.attendanceSummary)
    ) {
      onChange({
        ...value,
        attendanceSummary: attendanceContext,
        dailyEntries: nextEntries,
        monthlyWeeklySummaries: nextWeeklySummaries,
      })
    }
  }, [attendanceContext, monthlyWeeks, onChange, reportType, value])

  const updateValue = (updates: Partial<StructuredDayReportData>) => {
    onChange({ ...value, ...updates })
  }

  const toggleDate = (date: string) => {
    const selected = new Set(value.selectedDays)

    if (selected.has(date)) {
      selected.delete(date)
    } else {
      selected.add(date)
    }

    updateValue({
      selectedDays: dateOptions
        .map((option) => option.date)
        .filter((optionDate) => selected.has(optionDate)),
    })
  }

  const updateDailyEntry = (
    date: string,
    updates: Partial<Omit<DayReportEntry, "date" | "dayName" | "attendance">>
  ) => {
    updateValue({
      dailyEntries: value.dailyEntries.map((entry) =>
        entry.date === date ? { ...entry, ...updates } : entry
      ),
    })
  }

  const periodIsReady = Boolean(periodStart && periodEnd)
  const selectionReady = Boolean(classId && studentProfileId && periodIsReady)
  const hasAttendance = Boolean(attendanceContext?.sessions.length)

  return (
    <Card className="border-emerald-100 bg-emerald-50/30">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              {reportType === "weekly"
                ? "Weekly Day-Based Report Builder"
                : "Monthly Report Builder"}
            </CardTitle>
            <CardDescription>
              {reportType === "weekly"
                ? "Choose the days to include, review attendance, and write focused daily notes."
                : "Add monthly summaries, optional daily notes, and next-month focus."}
            </CardDescription>
          </div>
          {periodIsReady && (
            <Badge variant="outline" className="w-fit bg-background">
              {formatDisplayDate(periodStart)} - {formatDisplayDate(periodEnd)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!periodIsReady && (
          <EmptyBuilderState
            icon={<CalendarDays className="h-8 w-8" />}
            title="Select a report period"
            description="Set Period Start and Period End above to begin building this report."
          />
        )}

        {periodIsReady && !selectionReady && (
          <EmptyBuilderState
            icon={<BookOpen className="h-8 w-8" />}
            title="Select class and student to load attendance"
            description="Attendance will auto-fill after class, student, and period are selected."
          />
        )}

        {periodIsReady && (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">
                  {reportType === "weekly"
                    ? "Select days inside this week"
                    : "Optional daily notes"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {reportType === "weekly"
                    ? "Pick the class days you want to include in the weekly report."
                    : "Choose specific dates only if you want day-by-day notes in the monthly report."}
                </p>
              </div>
              {isLoadingAttendance && (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading attendance
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {dateOptions.map((option) => {
                const isSelected = value.selectedDays.includes(option.date)
                const attendance = resolveAttendanceForDate(
                  attendanceContext,
                  option.date
                )

                return (
                  <button
                    key={option.date}
                    type="button"
                    onClick={() => toggleDate(option.date)}
                    disabled={disabled}
                    className={`rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-emerald-500 bg-white shadow-sm ring-1 ring-emerald-200"
                        : "border-border bg-background hover:border-emerald-200"
                    }`}
                  >
                    <div className="text-sm font-semibold">{option.dayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDisplayDate(option.date)}
                    </div>
                    <div className="mt-2">
                      <AttendanceStatusBadge attendance={attendance} compact />
                    </div>
                  </button>
                )
              })}
            </div>

            {selectionReady && !isLoadingAttendance && !hasAttendance && (
              <div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                No attendance found for this period. You can still write report
                notes manually.
              </div>
            )}
          </div>
        )}

        {reportType === "monthly" && periodIsReady && (
          <MonthlySummaryEditor
            value={value}
            onChange={updateValue}
            disabled={disabled}
          />
        )}

        {value.dailyEntries.length > 0 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Daily report entries</h3>
              <p className="text-xs text-muted-foreground">
                Attendance is read-only from real session records. Add teaching
                and performance notes below.
              </p>
            </div>

            <div className="grid gap-2 lg:grid-cols-2">
              {value.dailyEntries.map((entry) => (
                <DailyEntryCard
                  key={entry.date}
                  entry={entry}
                  disabled={disabled}
                  onChange={(updates) => updateDailyEntry(entry.date, updates)}
                />
              ))}
            </div>
          </div>
        )}

        {reportType === "weekly" && (
          <WeeklyFocusEditor
            value={value.nextWeekFocus}
            disabled={disabled}
            onChange={(nextWeekFocus) => updateValue({ nextWeekFocus })}
          />
        )}
      </CardContent>
    </Card>
  )
}

function DailyEntryCard({
  entry,
  disabled,
  onChange,
}: {
  entry: DayReportEntry
  disabled: boolean
  onChange: (
    updates: Partial<Omit<DayReportEntry, "date" | "dayName" | "attendance">>
  ) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const summary =
    entry.taughtToday.trim() ||
    entry.homework.trim() ||
    entry.performance.trim() ||
    entry.teacherNote.trim() ||
    "No daily notes added yet"

  return (
    <Card className="overflow-hidden bg-background">
      <button
        type="button"
        className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
        onClick={() => setIsOpen((current) => !current)}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{entry.dayName}</CardTitle>
            <CardDescription>{formatDisplayDate(entry.date)}</CardDescription>
            {entry.sourceDailyReportId && (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700"
              >
                Synced daily
              </Badge>
            )}
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {summary}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <AttendanceStatusBadge attendance={entry.attendance} />
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {isOpen ? "Hide" : "Expand"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </div>
      </button>

      {isOpen && (
        <CardContent className="space-y-4 border-t bg-muted/10 p-4">
          {entry.attendance?.startTime && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(entry.attendance.startTime)}
              {entry.attendance.endTime
                ? ` - ${formatTime(entry.attendance.endTime)}`
                : ""}
              {entry.attendance.sessionCount > 1
                ? ` (${entry.attendance.sessionCount} sessions)`
                : ""}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <TextareaField
              label="What was taught today?"
              value={entry.taughtToday}
              disabled={disabled}
              placeholder="Lesson topics, surah/ayah covered, concepts explained..."
              onChange={(taughtToday) => onChange({ taughtToday })}
            />
            <TextareaField
              label="Homework / lesson work"
              value={entry.homework}
              disabled={disabled}
              placeholder="Homework assigned, lesson practice, memorization work..."
              onChange={(homework) => onChange({ homework })}
            />
            <TextareaField
              label="Student performance"
              value={entry.performance}
              disabled={disabled}
              placeholder="Accuracy, confidence, fluency, understanding..."
              onChange={(performance) => onChange({ performance })}
            />
            <TextareaField
              label="Behavior / participation"
              value={entry.behavior}
              disabled={disabled}
              placeholder="Participation, focus, attitude, discipline..."
              onChange={(behavior) => onChange({ behavior })}
            />
            <div className="md:col-span-2">
              <TextareaField
                label="Teacher note for this day"
                value={entry.teacherNote}
                disabled={disabled}
                placeholder="Any extra note for student or parent..."
                onChange={(teacherNote) => onChange({ teacherNote })}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function WeeklyFocusEditor({
  value,
  disabled,
  onChange,
}: {
  value: WeeklyFocus
  disabled: boolean
  onChange: (value: WeeklyFocus) => void
}) {
  const update = (updates: Partial<WeeklyFocus>) => onChange({ ...value, ...updates })

  return (
    <Card className="bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-emerald-600" />
          Next week focus
        </CardTitle>
        <CardDescription>
          Plan what should happen after this weekly report.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <TextareaField
          label="What will be taught next week"
          value={value.whatWillBeTaught}
          disabled={disabled}
          onChange={(whatWillBeTaught) => update({ whatWillBeTaught })}
        />
        <TextareaField
          label="Areas to improve"
          value={value.areasToImprove}
          disabled={disabled}
          onChange={(areasToImprove) => update({ areasToImprove })}
        />
        <TextareaField
          label="Homework / follow-up"
          value={value.homeworkFollowUp}
          disabled={disabled}
          onChange={(homeworkFollowUp) => update({ homeworkFollowUp })}
        />
        <TextareaField
          label="Teacher remarks"
          value={value.teacherRemarks}
          disabled={disabled}
          onChange={(teacherRemarks) => update({ teacherRemarks })}
        />
      </CardContent>
    </Card>
  )
}

function MonthlySummaryEditor({
  value,
  disabled,
  onChange,
}: {
  value: StructuredDayReportData
  disabled: boolean
  onChange: (updates: Partial<StructuredDayReportData>) => void
}) {
  const updateSummary = (updates: Partial<MonthlySummary>) =>
    onChange({ monthlySummary: { ...value.monthlySummary, ...updates } })

  const updateWeeklySummary = (id: string, summary: string) =>
    onChange({
      monthlyWeeklySummaries: value.monthlyWeeklySummaries.map((week) =>
        week.id === id ? { ...week, summary } : week
      ),
    })

  return (
    <div className="space-y-4">
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            Monthly summary
          </CardTitle>
          <CardDescription>
            Capture the month at a higher level. Daily notes are optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <TextareaField
            label="Lessons covered"
            value={value.monthlySummary.lessonsCovered}
            disabled={disabled}
            onChange={(lessonsCovered) => updateSummary({ lessonsCovered })}
          />
          <TextareaField
            label="Homework completion"
            value={value.monthlySummary.homeworkCompletion}
            disabled={disabled}
            onChange={(homeworkCompletion) =>
              updateSummary({ homeworkCompletion })
            }
          />
          <TextareaField
            label="Strengths"
            value={value.monthlySummary.strengths}
            disabled={disabled}
            onChange={(strengths) => updateSummary({ strengths })}
          />
          <TextareaField
            label="Areas for improvement"
            value={value.monthlySummary.areasForImprovement}
            disabled={disabled}
            onChange={(areasForImprovement) =>
              updateSummary({ areasForImprovement })
            }
          />
          <TextareaField
            label="Next month focus"
            value={value.monthlySummary.nextMonthFocus}
            disabled={disabled}
            onChange={(nextMonthFocus) => updateSummary({ nextMonthFocus })}
          />
          <TextareaField
            label="Teacher remarks"
            value={value.monthlySummary.teacherRemarks}
            disabled={disabled}
            onChange={(teacherRemarks) => updateSummary({ teacherRemarks })}
          />
        </CardContent>
      </Card>

      {value.monthlyWeeklySummaries.length > 0 && (
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="text-base">Weekly summary blocks</CardTitle>
            <CardDescription>
              Optional: summarize each week of this monthly period.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {value.monthlyWeeklySummaries.map((week) => (
              <TextareaField
                key={week.id}
                label={`${week.label} (${formatDisplayDate(
                  week.periodStart
                )} - ${formatDisplayDate(week.periodEnd)})`}
                value={week.summary}
                disabled={disabled}
                placeholder="Summarize progress, lessons, homework, and participation for this week..."
                onChange={(summary) => updateWeeklySummary(week.id, summary)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TextareaField({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-[88px] resize-y bg-background"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function EmptyBuilderState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-dashed bg-background p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function AttendanceStatusBadge({
  attendance,
  compact = false,
}: {
  attendance: DayReportAttendanceSnapshot | null
  compact?: boolean
}) {
  if (!attendance || attendance.status === "no_record") {
    return (
      <Badge variant="outline" className="bg-muted/30 text-muted-foreground">
        {compact ? "No record" : "No attendance record"}
      </Badge>
    )
  }

  const className =
    attendance.status === "present"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : attendance.status === "late"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : attendance.status === "excused"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-rose-200 bg-rose-50 text-rose-700"

  return (
    <Badge variant="outline" className={className}>
      {attendance.status === "present" && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {attendance.status === "late" && <Clock className="mr-1 h-3 w-3" />}
      {attendance.status === "absent" && <AlertCircle className="mr-1 h-3 w-3" />}
      {attendance.label}
      {attendance.lateMinutes ? ` (${attendance.lateMinutes} min late)` : ""}
    </Badge>
  )
}

function normalizeDailyEntry(input: Partial<DayReportEntry>): DayReportEntry {
  const date = input.date || ""

  return {
    date,
    dayName: input.dayName || getDayName(date),
    attendance: input.attendance ?? null,
    taughtToday: input.taughtToday || "",
    homework: input.homework || "",
    performance: input.performance || "",
    behavior: input.behavior || "",
    teacherNote: input.teacherNote || "",
    sourceDailyReportId: input.sourceDailyReportId ?? null,
    sourceDailyReportUpdatedAt: input.sourceDailyReportUpdatedAt ?? null,
  }
}

function resolveDailyReportForDate(
  attendanceContext: ReportAttendanceContext | null,
  date: string
) {
  return attendanceContext?.dailyReports?.find((report) => report.date === date) ?? null
}

function buildEntryFromDailyReport(report: DailyReportSnapshot): Partial<DayReportEntry> {
  const sectionContent = (sectionType: string) =>
    report.sections
      .find((section) => section.sectionType === sectionType)
      ?.content?.trim() || ""

  const strengths = sectionContent("strengths")
  const improvements = sectionContent("improvements")
  const performance = [strengths, improvements].filter(Boolean).join("\n\n")

  return {
    sourceDailyReportId: report.id,
    sourceDailyReportUpdatedAt: report.updatedAt,
    taughtToday:
      sectionContent("grades") ||
      sectionContent("teacher_remarks") ||
      sectionContent("next_focus"),
    homework: sectionContent("homework"),
    performance,
    behavior: sectionContent("behavior"),
    teacherNote: sectionContent("teacher_remarks") || sectionContent("next_focus"),
  }
}

function resolveAttendanceForDate(
  attendanceContext: ReportAttendanceContext | null,
  date: string
): DayReportAttendanceSnapshot | null {
  const sessions =
    attendanceContext?.sessions.filter((session) => session.date === date) ?? []

  if (sessions.length === 0) {
    return {
      status: "no_record",
      label: "No attendance record",
      lateMinutes: null,
      notes: null,
      sessionCount: 0,
      startTime: null,
      endTime: null,
    }
  }

  const attendanceSession =
    sessions.find((session) => session.attendance) ?? sessions[0]
  const attendance = attendanceSession.attendance

  if (!attendance) {
    return {
      status: "no_record",
      label: "No attendance record",
      lateMinutes: null,
      notes: null,
      sessionCount: sessions.length,
      startTime: attendanceSession.startTime,
      endTime: attendanceSession.endTime,
    }
  }

  return {
    status: attendance.status,
    label: toTitleCase(attendance.status),
    lateMinutes: attendance.lateMinutes,
    notes: attendance.notes,
    sessionCount: sessions.length,
    startTime: attendanceSession.startTime,
    endTime: attendanceSession.endTime,
  }
}

function buildWeeklySummaryBlocks(start: string, end: string): MonthlyWeeklySummary[] {
  const dates = getDatesInRange(start, end, 45)
  const blocks: MonthlyWeeklySummary[] = []

  for (let index = 0; index < dates.length; index += 7) {
    const weekDates = dates.slice(index, index + 7)

    if (weekDates.length === 0) {
      continue
    }

    blocks.push({
      id: `week-${blocks.length + 1}`,
      label: `Week ${blocks.length + 1}`,
      periodStart: weekDates[0].date,
      periodEnd: weekDates[weekDates.length - 1].date,
      summary: "",
    })
  }

  return blocks
}

function getDatesInRange(start: string, end: string, maxDays: number) {
  const startDate = parseDateInput(start)
  const endDate = parseDateInput(end)

  if (!startDate || !endDate || startDate > endDate) {
    return []
  }

  const dates: Array<{ date: string; dayName: string }> = []
  const cursor = new Date(startDate)

  while (cursor <= endDate && dates.length < maxDays) {
    dates.push({
      date: formatDateInput(cursor),
      dayName: dayFormatter.format(cursor),
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

function parseDateInput(value: string) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string) {
  const date = parseDateInput(value)

  return date ? dateFormatter.format(date) : "Not set"
}

function getDayName(value: string) {
  const date = parseDateInput(value)

  return date ? dayFormatter.format(date) : ""
}

function formatTime(value: string) {
  return timeFormatter.format(new Date(value))
}

function toTitleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
