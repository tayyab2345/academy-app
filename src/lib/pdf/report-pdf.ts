import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { renderPdfFromHtml } from "@/lib/pdf/browser"
import {
  AcademyBranding,
  buildPDFFilename,
  escapeHtml,
  formatDateForPDF,
  resolvePdfImageSource,
  renderAcademyHeader,
  renderPDFFooter,
  renderTextBlock,
} from "@/lib/pdf/pdf-utils"

interface AttendanceSummary {
  totalSessions: number
  present: number
  late: number
  absent: number
  excused?: number
}

interface StructuredDayReportData {
  builderType: "weekly_day_builder" | "monthly_day_builder"
  reportType: "weekly" | "monthly"
  attendanceSummary: AttendanceSummary | null
  dailyEntries: Array<{
    date: string
    dayName: string
    attendance: {
      label: string
      lateMinutes: number | null
      startTime: string | null
      endTime: string | null
    } | null
    taughtToday: string
    homework: string
    performance: string
    behavior: string
    teacherNote: string
  }>
  nextWeekFocus: {
    whatWillBeTaught: string
    areasToImprove: string
    homeworkFollowUp: string
    teacherRemarks: string
  }
  monthlySummary: {
    lessonsCovered: string
    homeworkCompletion: string
    strengths: string
    areasForImprovement: string
    nextMonthFocus: string
    teacherRemarks: string
  }
  monthlyWeeklySummaries: Array<{
    id: string
    label: string
    periodStart: string
    periodEnd: string
    summary: string
  }>
}

export interface ReportPDFData {
  report: {
    id: string
    reportType: string
    reportDate: Date
    periodStart: Date
    periodEnd: Date
    publishedAt: Date | null
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
    sections: {
      sectionType: string
      content: string | null
      contentJson: Prisma.JsonValue | null
      rating: number | null
      orderIndex: number
    }[]
  }
  academy: AcademyBranding
}

const reportTypeLabels: Record<string, string> = {
  daily: "Daily Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  term: "Term Report",
}

const sectionTypeLabels: Record<string, string> = {
  attendance: "Attendance Summary",
  homework: "Homework Completion",
  strengths: "Strengths",
  improvements: "Areas for Improvement",
  next_focus: "Next Focus",
  teacher_remarks: "Teacher Remarks",
  behavior: "Behavior",
  grades: "Grades",
}

function parseAttendanceSummary(contentJson: Prisma.JsonValue | null): AttendanceSummary | null {
  if (!contentJson || typeof contentJson !== "object" || Array.isArray(contentJson)) {
    return null
  }

  const source = contentJson as Record<string, unknown>
  const readNumber = (key: string) => {
    const value = source[key]

    if (typeof value === "number") {
      return value
    }

    if (typeof value === "string") {
      const numeric = Number.parseFloat(value)
      return Number.isFinite(numeric) ? numeric : 0
    }

    return 0
  }

  return {
    totalSessions: readNumber("totalSessions"),
    present: readNumber("present"),
    late: readNumber("late"),
    absent: readNumber("absent"),
    excused: readNumber("excused"),
  }
}

function isStructuredDayReportData(
  value: Prisma.JsonValue | null
): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const builderType = (value as Record<string, unknown>).builderType

  return (
    builderType === "weekly_day_builder" ||
    builderType === "monthly_day_builder"
  )
}

function renderSmallTextBlock(label: string, value: string | null | undefined) {
  return `
    <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #ffffff;">
      <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em;">${escapeHtml(label)}</div>
      <div style="font-size: 13px; margin-top: 4px; white-space: pre-wrap;">${renderTextBlock(
        value?.trim() || "Not added"
      )}</div>
    </div>
  `
}

function renderAttendanceStats(attendance: AttendanceSummary) {
  const stats = [
    { label: "Sessions", value: attendance.totalSessions, bg: "#f3f4f6", color: "#111827" },
    { label: "Present", value: attendance.present, bg: "#dcfce7", color: "#16a34a" },
    { label: "Late", value: attendance.late, bg: "#fef3c7", color: "#ca8a04" },
    { label: "Absent", value: attendance.absent, bg: "#fee2e2", color: "#dc2626" },
    { label: "Excused", value: attendance.excused ?? 0, bg: "#dbeafe", color: "#2563eb" },
  ]

  return `
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 14px;">
      ${stats
        .map(
          (stat) => `
        <div style="text-align: center; padding: 10px; background: ${stat.bg}; border-radius: 8px;">
          <div style="font-size: 18px; font-weight: 700; color: ${stat.color};">${stat.value || 0}</div>
          <div style="font-size: 11px; color: #6b7280;">${escapeHtml(stat.label)}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `
}

function renderStructuredDayReport(data: StructuredDayReportData) {
  const dailyEntries = Array.isArray(data.dailyEntries) ? data.dailyEntries : []
  const monthlyWeeklySummaries = Array.isArray(data.monthlyWeeklySummaries)
    ? data.monthlyWeeklySummaries
    : []
  const monthlySummary = data.monthlySummary ?? {
    lessonsCovered: "",
    homeworkCompletion: "",
    strengths: "",
    areasForImprovement: "",
    nextMonthFocus: "",
    teacherRemarks: "",
  }
  const nextWeekFocus = data.nextWeekFocus ?? {
    whatWillBeTaught: "",
    areasToImprove: "",
    homeworkFollowUp: "",
    teacherRemarks: "",
  }

  return `
    ${data.attendanceSummary ? renderAttendanceStats(data.attendanceSummary) : ""}

    ${
      data.reportType === "monthly"
        ? `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
        ${renderSmallTextBlock("Lessons covered", monthlySummary.lessonsCovered)}
        ${renderSmallTextBlock("Homework completion", monthlySummary.homeworkCompletion)}
        ${renderSmallTextBlock("Strengths", monthlySummary.strengths)}
        ${renderSmallTextBlock("Areas for improvement", monthlySummary.areasForImprovement)}
        ${renderSmallTextBlock("Next month focus", monthlySummary.nextMonthFocus)}
        ${renderSmallTextBlock("Teacher remarks", monthlySummary.teacherRemarks)}
      </div>
      ${
        monthlyWeeklySummaries.some((week) => week?.summary?.trim())
          ? `
        <h4 style="font-size: 15px; margin: 12px 0 8px;">Weekly summaries</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
          ${monthlyWeeklySummaries
            .filter((week) => week?.summary?.trim())
            .map((week) =>
              renderSmallTextBlock(
                `${week.label}: ${week.periodStart} - ${week.periodEnd}`,
                week.summary
              )
            )
            .join("")}
        </div>
      `
          : ""
      }
    `
        : ""
    }

    ${
      dailyEntries.length > 0
        ? `
      <h4 style="font-size: 15px; margin: 12px 0 8px;">Daily entries</h4>
      ${dailyEntries
        .map(
          (entry) => `
        <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; margin-bottom: 12px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px;">
            <div>
              <div style="font-size: 16px; font-weight: 700;">${escapeHtml(entry?.dayName || "Day")}</div>
              <div style="font-size: 12px; color: #6b7280;">${escapeHtml(entry?.date || "")}</div>
            </div>
            <div style="font-size: 12px; font-weight: 700; color: #047857;">
              ${escapeHtml(entry?.attendance?.label || "No attendance record")}
              ${
                entry?.attendance?.lateMinutes
                  ? ` (${entry.attendance.lateMinutes} min late)`
                  : ""
              }
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            ${renderSmallTextBlock("What was taught", entry?.taughtToday)}
            ${renderSmallTextBlock("Homework / lesson work", entry?.homework)}
            ${renderSmallTextBlock("Student performance", entry?.performance)}
            ${renderSmallTextBlock("Behavior / participation", entry?.behavior)}
            <div style="grid-column: 1 / -1;">
              ${renderSmallTextBlock("Teacher note", entry?.teacherNote)}
            </div>
          </div>
        </div>
      `
        )
        .join("")}
    `
        : ""
    }

    ${
      data.reportType === "weekly"
        ? `
      <h4 style="font-size: 15px; margin: 12px 0 8px;">Next week focus</h4>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
        ${renderSmallTextBlock("What will be taught", nextWeekFocus.whatWillBeTaught)}
        ${renderSmallTextBlock("Areas to improve", nextWeekFocus.areasToImprove)}
        ${renderSmallTextBlock("Homework / follow-up", nextWeekFocus.homeworkFollowUp)}
        ${renderSmallTextBlock("Teacher remarks", nextWeekFocus.teacherRemarks)}
      </div>
    `
        : ""
    }
  `
}

export async function fetchReportData(reportId: string): Promise<ReportPDFData | null> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      class: {
        include: {
          course: {
            select: {
              code: true,
              name: true,
            },
          },
          academy: {
            select: {
              name: true,
              logoUrl: true,
              primaryColor: true,
              secondaryColor: true,
              contactEmail: true,
            },
          },
        },
      },
      teacherProfile: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      sections: {
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  })

  if (!report) {
    return null
  }

  const academyLogoUrl = await resolvePdfImageSource(report.class.academy.logoUrl)

  return {
    report: {
      id: report.id,
      reportType: report.reportType,
      reportDate: report.reportDate,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      publishedAt: report.publishedAt,
      studentProfile: {
        studentId: report.studentProfile.studentId,
        user: {
          firstName: report.studentProfile.user.firstName,
          lastName: report.studentProfile.user.lastName,
        },
      },
      class: {
        name: report.class.name,
        course: {
          code: report.class.course.code,
          name: report.class.course.name,
        },
      },
      teacherProfile: {
        user: {
          firstName: report.teacherProfile.user.firstName,
          lastName: report.teacherProfile.user.lastName,
        },
      },
      sections: report.sections.map((section) => ({
        sectionType: section.sectionType,
        content: section.content,
        contentJson: section.contentJson,
        rating: section.rating,
        orderIndex: section.orderIndex,
      })),
    },
    academy: {
      name: report.class.academy.name,
      logoUrl: academyLogoUrl,
      primaryColor: report.class.academy.primaryColor,
      secondaryColor: report.class.academy.secondaryColor,
      contactEmail: report.class.academy.contactEmail,
    },
  }
}

function renderReportSection(section: ReportPDFData["report"]["sections"][number]) {
  if (isStructuredDayReportData(section.contentJson)) {
    return renderStructuredDayReport(
      section.contentJson as unknown as StructuredDayReportData
    )
  }

  if (section.sectionType === "attendance") {
    const attendance = parseAttendanceSummary(section.contentJson)

    if (attendance) {
      return `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px;">
          <div style="text-align: center; padding: 12px; background: #f3f4f6; border-radius: 8px;">
            <div style="font-size: 20px; font-weight: 700;">${attendance.totalSessions}</div>
            <div style="font-size: 12px; color: #6b7280;">Sessions</div>
          </div>
          <div style="text-align: center; padding: 12px; background: #dcfce7; border-radius: 8px;">
            <div style="font-size: 20px; font-weight: 700; color: #16a34a;">${attendance.present}</div>
            <div style="font-size: 12px; color: #6b7280;">Present</div>
          </div>
          <div style="text-align: center; padding: 12px; background: #fef3c7; border-radius: 8px;">
            <div style="font-size: 20px; font-weight: 700; color: #ca8a04;">${attendance.late}</div>
            <div style="font-size: 12px; color: #6b7280;">Late</div>
          </div>
          <div style="text-align: center; padding: 12px; background: #fee2e2; border-radius: 8px;">
            <div style="font-size: 20px; font-weight: 700; color: #dc2626;">${attendance.absent}</div>
            <div style="font-size: 12px; color: #6b7280;">Absent</div>
          </div>
        </div>
        ${section.content ? `<p style="white-space: pre-wrap;">${renderTextBlock(section.content)}</p>` : ""}
      `
    }
  }

  return `
    <p style="white-space: pre-wrap;">${renderTextBlock(section.content || "No comments")}</p>
    ${
      section.rating
        ? `
      <div style="margin-top: 8px;">
        ${Array.from({ length: 5 })
          .map(
            (_value, index) =>
              `<span style="font-size: 18px; color: ${
                index < section.rating! ? "#eab308" : "#d1d5db"
              };">★</span>`
          )
          .join("")}
      </div>
    `
        : ""
    }
  `
}

function renderReportHTML(data: ReportPDFData) {
  const { academy, report } = data

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #111827;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          .summary-card {
            background: #f9fafb;
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 24px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px 20px;
            font-size: 14px;
          }
          .label {
            color: #6b7280;
            font-weight: 600;
            margin-right: 6px;
          }
          .section-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          .section-title {
            color: ${academy.primaryColor};
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${renderAcademyHeader(academy)}

          <h2 style="margin: 0 0 8px;">${escapeHtml(
            reportTypeLabels[report.reportType] || report.reportType
          )}</h2>
          <p style="margin: 0 0 24px; color: #6b7280;">
            ${escapeHtml(report.class.course.code)}: ${escapeHtml(report.class.name)}
          </p>

          <div class="summary-card">
            <div class="summary-grid">
              <div>
                <span class="label">Student:</span>
                ${escapeHtml(report.studentProfile.user.firstName)} ${escapeHtml(
                  report.studentProfile.user.lastName
                )} (${escapeHtml(report.studentProfile.studentId)})
              </div>
              <div>
                <span class="label">Teacher:</span>
                ${escapeHtml(report.teacherProfile.user.firstName)} ${escapeHtml(
                  report.teacherProfile.user.lastName
                )}
              </div>
              <div>
                <span class="label">Report Date:</span>
                ${formatDateForPDF(report.reportDate)}
              </div>
              <div>
                <span class="label">Period:</span>
                ${formatDateForPDF(report.periodStart)} - ${formatDateForPDF(report.periodEnd)}
              </div>
              ${
                report.publishedAt
                  ? `
                <div>
                  <span class="label">Published:</span>
                  ${formatDateForPDF(report.publishedAt)}
                </div>
              `
                  : ""
              }
            </div>
          </div>

          ${report.sections
            .map(
              (section) => `
            <div class="section-card">
              <div class="section-title">${escapeHtml(
                isStructuredDayReportData(section.contentJson)
                  ? (section.contentJson as unknown as StructuredDayReportData)
                      .reportType === "weekly"
                    ? "Weekly Day-Based Report"
                    : "Monthly Report Builder"
                  : sectionTypeLabels[section.sectionType] || section.sectionType
              )}</div>
              ${renderReportSection(section)}
            </div>
          `
            )
            .join("")}

          ${renderPDFFooter(academy)}
        </div>
      </body>
    </html>
  `
}

export async function generateReportPDFBuffer(data: ReportPDFData) {
  return renderPdfFromHtml(renderReportHTML(data))
}

export async function generateReportPDF(reportId: string) {
  const data = await fetchReportData(reportId)

  if (!data) {
    return null
  }

  return generateReportPDFBuffer(data)
}

export function getReportPDFFilename(report: ReportPDFData["report"]) {
  const studentName = `${report.studentProfile.user.firstName}_${report.studentProfile.user.lastName}`.replace(
    /\s+/g,
    "_"
  )

  return buildPDFFilename(`report_${studentName}`, report.id, report.reportDate)
}
