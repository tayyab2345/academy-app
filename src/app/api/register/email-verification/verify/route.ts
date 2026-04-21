import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { formatPrismaError, isPrismaInitializationError, prisma } from "@/lib/prisma"
import { normalizeEmail } from "@/lib/registration/email-verification"

const verifyVerificationSchema = z.object({
  email: z.string().email(),
  verificationId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = verifyVerificationSchema.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Please enter the 6-digit verification code.",
          code: "INVALID_VERIFICATION_CODE",
        },
        { status: 400 }
      )
    }

    const email = normalizeEmail(validatedData.data.email)

    const verification = await prisma.emailVerification.findUnique({
      where: { id: validatedData.data.verificationId },
      select: {
        id: true,
        email: true,
        code: true,
        verified: true,
        expiresAt: true,
      },
    })

    if (!verification || verification.email !== email) {
      return NextResponse.json(
        {
          error: "Verification request not found. Please request a new code.",
          code: "VERIFICATION_NOT_FOUND",
        },
        { status: 404 }
      )
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        {
          error: "This verification code has expired. Please request a new code.",
          code: "VERIFICATION_EXPIRED",
        },
        { status: 410 }
      )
    }

    if (verification.verified) {
      return NextResponse.json({
        success: true,
        code: "EMAIL_ALREADY_VERIFIED",
        message: "Email already verified.",
        verificationId: verification.id,
      })
    }

    if (verification.code !== validatedData.data.code) {
      return NextResponse.json(
        {
          error: "The verification code you entered is incorrect.",
          code: "INVALID_VERIFICATION_CODE",
        },
        { status: 400 }
      )
    }

    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: {
        verified: true,
      },
    })

    return NextResponse.json({
      success: true,
      code: "EMAIL_VERIFIED",
      message: "Email verified successfully.",
      verificationId: verification.id,
    })
  } catch (error) {
    console.error("[register/email-verification/verify] failed", {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
      prisma: formatPrismaError(error),
    })

    if (isPrismaInitializationError(error)) {
      console.error(
        "[database][register/email-verification/verify] Prisma initialization failure",
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

    return NextResponse.json(
      {
        error: "Unable to verify the code right now. Please try again.",
        code: "VERIFICATION_FAILED",
      },
      { status: 500 }
    )
  }
}

