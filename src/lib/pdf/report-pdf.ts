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
  }
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
                sectionTypeLabels[section.sectionType] || section.sectionType
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
