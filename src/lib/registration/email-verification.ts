import { randomInt } from "crypto"
import { EmailStatus } from "@prisma/client"
import { logEmailAttempt } from "@/lib/email/email-helpers"
import { isEmailConfigured, sendEmail } from "@/lib/email/email-service"
import { renderRegistrationVerificationEmail } from "@/lib/email/templates/registration-verification"

export const EMAIL_VERIFICATION_EXPIRY_MINUTES = 10

function getEmailProviderName() {
  return process.env.EMAIL_PROVIDER?.trim() || "resend"
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function generateVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0")
}

export function createVerificationExpiryDate() {
  return new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000)
}

export async function sendRegistrationVerificationEmail(params: {
  email: string
  code: string
  verificationId: string
}) {
  const recipientEmail = normalizeEmail(params.email)
  const provider = getEmailProviderName()
  const { subject, html, text } = renderRegistrationVerificationEmail({
    code: params.code,
    expiresInMinutes: EMAIL_VERIFICATION_EXPIRY_MINUTES,
  })

  if (!isEmailConfigured()) {
    const error = `${provider} email provider is not configured`

    await logEmailAttempt({
      recipientEmail,
      subject,
      template: "registration_verification",
      status: EmailStatus.failed,
      provider,
      errorMessage: error,
      entityType: "email_verification",
      entityId: params.verificationId,
      metadata: {
        deliveryStatus: "not_configured",
      },
    })

    return {
      success: false as const,
      status: "not_configured" as const,
      provider,
      error,
      subject,
    }
  }

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  })

  await logEmailAttempt({
    recipientEmail,
    subject,
    template: "registration_verification",
    status: result.success ? EmailStatus.sent : EmailStatus.failed,
    provider: result.provider,
    providerMessageId: result.messageId,
    errorMessage: result.error,
    entityType: "email_verification",
    entityId: params.verificationId,
    metadata: {
      deliveryStatus: result.status,
    },
  })

  return {
    ...result,
    subject,
  }
}

