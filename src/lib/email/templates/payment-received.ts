import {
  AcademyBranding,
  escapeHtml,
  formatCurrencyForPDF,
  formatDateForPDF,
} from "@/lib/pdf/pdf-utils"

interface PaymentReceivedEmailData {
  studentName: string
  parentName?: string
  invoiceNumber: string
  paymentAmount: number
  currency: string
  paymentDate: Date
  remainingBalance: number
  invoiceUrl: string
  academy: AcademyBranding
}

export function renderPaymentReceivedEmail(data: PaymentReceivedEmailData) {
  const recipientName = data.parentName || data.studentName
  const subject = `Payment Received: ${data.invoiceNumber} - ${data.academy.name}`

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
            .badge { display: inline-block; background: #10b981; color: #ffffff; padding: 6px 12px; border-radius: 999px; font-size: 13px; margin-bottom: 16px; }
            .details { background: #f9fafb; border-radius: 10px; padding: 20px; margin: 24px 0; }
            .amount { font-size: 24px; font-weight: 700; color: #10b981; }
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
              <span class="badge">Payment Received</span>
              <p>Dear ${escapeHtml(recipientName)},</p>
              <p>We have received a payment for ${escapeHtml(data.studentName)}.</p>
              <div class="details">
                <p><strong>Invoice Number:</strong> ${escapeHtml(data.invoiceNumber)}</p>
                <p><strong>Payment Date:</strong> ${formatDateForPDF(data.paymentDate)}</p>
                <p class="amount">${formatCurrencyForPDF(data.paymentAmount, data.currency)}</p>
                <p><strong>Remaining Balance:</strong> ${formatCurrencyForPDF(data.remainingBalance, data.currency)}</p>
              </div>
              <a href="${data.invoiceUrl}" class="button">View Invoice</a>
            </div>
            <div class="footer">
              <p>${escapeHtml(data.academy.name)}</p>
              <p>${escapeHtml(data.academy.contactEmail)}</p>
              <p>This is an automated receipt. Please keep it for your records.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }
}
