import { Resend } from "resend"
import { readStoredDocumentFromUrl } from "@/lib/storage/document-storage"

export interface EmailAttachment {
  filename: string
  content?: Buffer | string
  path?: string
  contentType?: string
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string | string[]
  attachments?: EmailAttachment[]
}

export interface EmailResult {
  success: boolean
  status: "sent" | "failed" | "not_configured"
  messageId?: string
  error?: string
  provider: string
}

interface EmailProvider {
  send(options: EmailOptions): Promise<EmailResult>
}

async function prepareAttachment(attachment: EmailAttachment) {
  if (attachment.content !== undefined) {
    return {
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    }
  }

  if (!attachment.path) {
    console.warn(`Skipping attachment "${attachment.filename}" because it has no content or path`)
    return null
  }

  const storedDocument = await readStoredDocumentFromUrl(attachment.path)

  if (storedDocument) {
    return {
      filename: attachment.filename,
      content: storedDocument.buffer,
      contentType: attachment.contentType,
    }
  }

  if (/^https?:\/\//i.test(attachment.path)) {
    return {
      filename: attachment.filename,
      path: attachment.path,
      contentType: attachment.contentType,
    }
  }

  console.warn(
    `Skipping attachment "${attachment.filename}" because the provider cannot safely access path "${attachment.path}"`
  )
  return null
}

class ResendProvider implements EmailProvider {
  private readonly client: Resend | null
  private readonly fromEmail: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY?.trim()
    this.fromEmail = process.env.EMAIL_FROM || "noreply@academyflow.com"
    this.client = apiKey ? new Resend(apiKey) : null
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    if (!this.client) {
      const error = "RESEND_API_KEY is not configured"
      console.warn(`[EMAIL NOT CONFIGURED] ${error}`, {
        to: options.to,
        subject: options.subject,
      })

      return {
        success: false,
        status: "not_configured",
        error,
        provider: "resend",
      }
    }

    try {
      const attachments = (
        await Promise.all(
          (options.attachments || []).map((attachment) => prepareAttachment(attachment))
        )
      ).filter((attachment): attachment is NonNullable<typeof attachment> => Boolean(attachment))

      const response = await this.client.emails.send({
        from: options.from || this.fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        attachments: attachments.length > 0 ? attachments : undefined,
      })

      if (response.error) {
        return {
          success: false,
          status: "failed",
          error: response.error.message,
          provider: "resend",
        }
      }

      return {
        success: true,
        status: "sent",
        messageId: response.data?.id,
        provider: "resend",
      }
    } catch (error) {
      console.error("Failed to send email via Resend:", error)
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Email sending failed",
        provider: "resend",
      }
    }
  }
}

class SMTPProvider implements EmailProvider {
  async send(_options: EmailOptions): Promise<EmailResult> {
    return {
      success: false,
      status: "failed",
      error: "SMTP provider not implemented",
      provider: "smtp",
    }
  }
}

let emailProvider: EmailProvider | null = null

export function getEmailProvider() {
  if (!emailProvider) {
    const provider = process.env.EMAIL_PROVIDER || "resend"

    if (provider === "smtp") {
      emailProvider = new SMTPProvider()
    } else {
      emailProvider = new ResendProvider()
    }
  }

  return emailProvider
}

export async function sendEmail(options: EmailOptions) {
  return getEmailProvider().send(options)
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST)
}
