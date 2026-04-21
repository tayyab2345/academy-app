import {
  AcademyBranding,
  escapeHtml,
  formatDateForPDF,
} from "@/lib/pdf/pdf-utils"

interface ReportPublishedEmailData {
  studentName: string
  parentName?: string
  reportType: string
  className: string
  reportDate: Date
  teacherName: string
  reportUrl: string
  academy: AcademyBranding
}

const reportTypeLabels: Record<string, string> = {
  daily: "Daily Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  term: "Term Report",
}

export function renderReportPublishedEmail(data: ReportPublishedEmailData) {
  const recipientName = data.parentName || data.studentName
  const subject = `New Progress Report Available - ${data.academy.name}`

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; background: #f5f5f5; color: #111827; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: ${data.academy.primaryColor}; color: #ffffff; padding: 24px; text-align: center; }
            .content { padding: 32px; }
            .details { background: #f9fafb; border-radius: 10px; padding: 20px; margin: 24px 0; }
            .button { display: inline-block; background: ${data.academy.primaryColor}; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 8px; }
            .footer { padding: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${escapeHtml(data.academy.name)}</h1>
            </div>
            <div class="content">
              <p>Dear ${escapeHtml(recipientName)},</p>
              <p>A new progress report is now available for ${escapeHtml(data.studentName)}.</p>
              <div class="details">
                <p><strong>Report Type:</strong> ${escapeHtml(
                  reportTypeLabels[data.reportType] || data.reportType
                )}</p>
                <p><strong>Class:</strong> ${escapeHtml(data.className)}</p>
                <p><strong>Report Date:</strong> ${formatDateForPDF(data.reportDate)}</p>
                <p><strong>Teacher:</strong> ${escapeHtml(data.teacherName)}</p>
              </div>
              <a href="${data.reportUrl}" class="button">View Report</a>
            </div>
            <div class="footer">
              <p>${escapeHtml(data.academy.name)}</p>
              <p>${escapeHtml(data.academy.contactEmail)}</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }
}
