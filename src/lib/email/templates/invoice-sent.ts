import {
  AcademyBranding,
  escapeHtml,
  formatCurrencyForPDF,
  formatDateForPDF,
} from "@/lib/pdf/pdf-utils"

interface InvoiceSentEmailData {
  studentName: string
  parentName?: string
  invoiceNumber: string
  description: string
  amount: number
  currency: string
  dueDate: Date
  invoiceUrl: string
  academy: AcademyBranding
}

export function renderInvoiceSentEmail(data: InvoiceSentEmailData) {
  const recipientName = data.parentName || data.studentName
  const subject = `New Invoice: ${data.invoiceNumber} - ${data.academy.name}`

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
            .amount { font-size: 28px; font-weight: 700; color: ${data.academy.primaryColor}; }
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
              <p>A new invoice has been issued for ${escapeHtml(data.studentName)}.</p>
              <div class="details">
                <p><strong>Invoice Number:</strong> ${escapeHtml(data.invoiceNumber)}</p>
                <p><strong>Description:</strong> ${escapeHtml(data.description)}</p>
                <p><strong>Due Date:</strong> ${formatDateForPDF(data.dueDate)}</p>
                <p class="amount">${formatCurrencyForPDF(data.amount, data.currency)}</p>
              </div>
              <a href="${data.invoiceUrl}" class="button">View Invoice</a>
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
