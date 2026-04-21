import { escapeHtml } from "@/lib/pdf/pdf-utils"

interface RegistrationVerificationEmailData {
  code: string
  expiresInMinutes: number
}

export function renderRegistrationVerificationEmail(
  data: RegistrationVerificationEmailData
) {
  const subject = "Your AcademyFlow verification code"

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; background: #f5f5f5; color: #111827; }
            .container { max-width: 560px; margin: 0 auto; background: #ffffff; }
            .header { background: #059669; color: #ffffff; padding: 24px; text-align: center; }
            .content { padding: 32px; }
            .code-box { margin: 24px 0; padding: 20px; border-radius: 12px; background: #ecfdf5; text-align: center; }
            .code { font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #065f46; }
            .footer { padding: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">AcademyFlow</h1>
            </div>
            <div class="content">
              <p>Use the verification code below to continue creating your academy account.</p>
              <div class="code-box">
                <div class="code">${escapeHtml(data.code)}</div>
              </div>
              <p>This code expires in ${data.expiresInMinutes} minutes.</p>
              <p>If you did not request this code, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>AcademyFlow</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Your AcademyFlow verification code is ${data.code}. It expires in ${data.expiresInMinutes} minutes.`,
  }
}

