import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { logEmailAttempt } from "@/lib/email/email-helpers"
import { isEmailConfigured, sendEmail } from "@/lib/email/email-service"

const testEmailSchema = z.object({
  email: z.string().email().optional(),
})

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const validated = testEmailSchema.safeParse(body)

    if (!validated.success && body && Object.keys(body).length > 0) {
      return NextResponse.json(
        { error: "Invalid email address", details: validated.error.errors },
        { status: 400 }
      )
    }

    const recipientEmail = validated.success
      ? validated.data.email || session.user.email
      : session.user.email

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No recipient email is available" },
        { status: 400 }
      )
    }

    const provider = process.env.EMAIL_PROVIDER?.trim() || "resend"
    const subject = "Test Email - AcademyFlow"

    if (!isEmailConfigured()) {
      const errorMessage = `${provider} email provider is not configured`

      await logEmailAttempt({
        recipientEmail,
        recipientUserId: session.user.id,
        subject,
        template: "test",
        status: "failed",
        provider,
        errorMessage,
        metadata: {
          test: true,
        },
      })

      return NextResponse.json(
        {
          success: false,
          configured: false,
          provider,
          error: errorMessage,
        },
        { status: 503 }
      )
    }

    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
          </head>
          <body style="font-family: system-ui, sans-serif; padding: 24px;">
            <h1>Email Delivery Test</h1>
            <p>This is a test email from AcademyFlow.</p>
            <p><strong>Recipient:</strong> ${recipientEmail}</p>
            <p><strong>Provider:</strong> ${provider}</p>
            <p><strong>Sent At:</strong> ${new Date().toLocaleString()}</p>
          </body>
        </html>
      `,
    })

    await logEmailAttempt({
      recipientEmail,
      recipientUserId: session.user.id,
      subject,
      template: "test",
      status: result.success ? "sent" : "failed",
      provider: result.provider,
      providerMessageId: result.messageId,
      errorMessage: result.error,
      metadata: {
        test: true,
        deliveryStatus: result.status,
      },
    })

    return NextResponse.json(
      {
        success: result.success,
        configured: true,
        provider: result.provider,
        status: result.status,
        messageId: result.messageId || null,
        error: result.error || null,
      },
      { status: result.success ? 200 : 502 }
    )
  } catch (error) {
    console.error("Failed to send test email:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send test email",
      },
      { status: 500 }
    )
  }
}
