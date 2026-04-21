import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { formatPrismaError, isPrismaInitializationError, prisma } from "@/lib/prisma"
import {
  createVerificationExpiryDate,
  generateVerificationCode,
  normalizeEmail,
  sendRegistrationVerificationEmail,
} from "@/lib/registration/email-verification"

const sendVerificationSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = sendVerificationSchema.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Please enter a valid email address.",
          code: "INVALID_EMAIL",
        },
        { status: 400 }
      )
    }

    const email = normalizeEmail(validatedData.data.email)

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error: "This email is already registered. Please sign in or use another email.",
          code: "EMAIL_ALREADY_REGISTERED",
        },
        { status: 409 }
      )
    }

    await prisma.emailVerification.deleteMany({
      where: { email },
    })

    const verification = await prisma.emailVerification.create({
      data: {
        email,
        code: generateVerificationCode(),
        expiresAt: createVerificationExpiryDate(),
      },
      select: {
        id: true,
        email: true,
        code: true,
        expiresAt: true,
      },
    })

    const emailResult = await sendRegistrationVerificationEmail({
      email: verification.email,
      code: verification.code,
      verificationId: verification.id,
    })

    if (!emailResult.success) {
      console.error("[register/email-verification/send] email delivery failed", {
        email,
        verificationId: verification.id,
        provider: emailResult.provider,
        deliveryStatus: emailResult.status,
        error: emailResult.error ?? null,
      })

      await prisma.emailVerification.delete({
        where: { id: verification.id },
      })

      return NextResponse.json(
        {
          error:
            emailResult.status === "not_configured"
              ? "Email verification is not configured in production yet. Please add the email settings and try again."
              : "We couldn't deliver your verification code just now. Please try again in a moment.",
          code:
            emailResult.status === "not_configured"
              ? "EMAIL_NOT_CONFIGURED"
              : "EMAIL_SEND_FAILED",
        },
        { status: 503 }
      )
    }

    console.info("[register/email-verification/send] email sent", {
      email,
      verificationId: verification.id,
      expiresAt: verification.expiresAt.toISOString(),
      provider: emailResult.provider,
      deliveryStatus: emailResult.status,
      messageId: emailResult.messageId ?? null,
    })

    return NextResponse.json({
      success: true,
      code: "VERIFICATION_CODE_SENT",
      message: "Verification code sent successfully.",
      verificationId: verification.id,
      expiresAt: verification.expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("[register/email-verification/send] failed", {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
      prisma: formatPrismaError(error),
    })

    if (isPrismaInitializationError(error)) {
      console.error(
        "[database][register/email-verification/send] Prisma initialization failure",
        formatPrismaError(error)
      )

      return NextResponse.json(
        {
          error: "Email verification is temporarily unavailable. Please try again shortly.",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        {
          error: "This email is already registered. Please sign in or use another email.",
          code: "EMAIL_ALREADY_REGISTERED",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error: "Unable to send verification code. Please try again.",
        code: "VERIFICATION_SEND_FAILED",
      },
      { status: 500 }
    )
  }
}
