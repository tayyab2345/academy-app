import {
  AcademyBranding,
  escapeHtml,
  formatCurrencyForPDF,
  formatDateForPDF,
} from "@/lib/pdf/pdf-utils"

interface ReminderOverdueEmailData {
  studentName: string
  parentName?: string
  invoiceNumber: string
  description: string
  outstandingAmount: number
  currency: string
  dueDate: Date
  daysOverdue: number
  invoiceUrl: string
  academy: AcademyBranding
}

export function renderReminderOverdueEmail(data: ReminderOverdueEmailData) {
  const recipientName = data.parentName || data.studentName
  const subject = `Reminder: Overdue Payment - ${data.invoiceNumber} - ${data.academy.name}`

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
            .header { background: #dc2626; color: #ffffff; padding: 24px; text-align: center; }
            .content { padding: 32px; }
            .badge { display: inline-block; background: #dc2626; color: #ffffff; padding: 6px 12px; border-radius: 999px; font-size: 13px; margin-bottom: 16px; }
            .details { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 20px; margin: 24px 0; }
            .amount { font-size: 24px; font-weight: 700; color: #dc2626; }
            .button { display: inline-block; background: ${data.academy.primaryColor}; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 8px; }
            .footer { padding: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Payment Reminder</h1>
            </div>
            <div class="content">
              <span class="badge">Payment Overdue</span>
              <p>Dear ${escapeHtml(recipientName)},</p>
              <p>This is a reminder that payment for ${escapeHtml(
                data.studentName
              )} is now <strong>${data.daysOverdue} days overdue</strong>.</p>
              <div class="details">
                <p><strong>Invoice Number:</strong> ${escapeHtml(data.invoiceNumber)}</p>
                <p><strong>Description:</strong> ${escapeHtml(data.description)}</p>
                <p><strong>Due Date:</strong> ${formatDateForPDF(data.dueDate)}</p>
                <p class="amount">${formatCurrencyForPDF(
                  data.outstandingAmount,
                  data.currency
                )}</p>
              </div>
              <a href="${data.invoiceUrl}" class="button">View Invoice</a>
            </div>
            <div class="footer">
              <p>${escapeHtml(data.academy.name)}</p>
              <p>${escapeHtml(data.academy.contactEmail)}</p>
              <p>This is an automated reminder. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }
}
