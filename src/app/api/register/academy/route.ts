import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { formatPrismaError, isPrismaInitializationError, prisma } from "@/lib/prisma"
import {
  isDemoModeEnabled,
  isEmailVerificationRequired,
  shouldSkipSubdomainCheck,
} from "@/lib/runtime-flags"
import { z } from "zod"

const registerSchema = z.object({
  academyName: z.string().min(2),
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
  contactEmail: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  verificationId: z.string().min(1).optional(),
})

const MAX_SUBDOMAIN_ATTEMPTS = 5

function normalizeSubdomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

function buildSubdomainBase(academyName: string, requestedSubdomain: string) {
  const preferred = normalizeSubdomain(requestedSubdomain)

  if (preferred.length >= 3) {
    return preferred
  }

  const fromName = normalizeSubdomain(academyName)

  if (fromName.length >= 3) {
    return fromName
  }

  return "academy"
}

function buildFallbackSubdomain(base: string, attempt: number) {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${attempt}`
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 7)

  const normalizedBase = normalizeSubdomain(base).slice(0, 24) || "academy"
  return `${normalizedBase}-${suffix}`.slice(0, 32)
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

function isSubdomainConflictError(error: Prisma.PrismaClientKnownRequestError) {
  const targets = Array.isArray(error.meta?.target)
    ? error.meta?.target.map(String)
    : typeof error.meta?.target === "string"
      ? [error.meta.target]
      : []

  return targets.includes("subdomain") || targets.includes("academies_subdomain_key")
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate input
    const validatedData = registerSchema.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: validatedData.error.errors },
        { status: 400 }
      )
    }

    const {
      academyName,
      subdomain: rawSubdomain,
      contactEmail,
      firstName,
      lastName,
      email,
      password,
      verificationId,
    } = validatedData.data
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedContactEmail = contactEmail.trim().toLowerCase()
    const requestedSubdomain = normalizeSubdomain(rawSubdomain)
    const subdomainBase = buildSubdomainBase(academyName, requestedSubdomain)
    const skipSubdomainCheck = shouldSkipSubdomainCheck()
    const demoMode = isDemoModeEnabled()
    const emailVerificationRequired = isEmailVerificationRequired()

    if (emailVerificationRequired) {
      const normalizedVerificationId = verificationId?.trim()

      if (!normalizedVerificationId) {
        return NextResponse.json(
          {
            error: "Please verify your email before creating your academy.",
            code: "EMAIL_VERIFICATION_REQUIRED",
          },
          { status: 400 }
        )
      }

      const verification = await prisma.emailVerification.findUnique({
        where: { id: normalizedVerificationId },
        select: {
          id: true,
          email: true,
          verified: true,
          expiresAt: true,
        },
      })

      if (!verification || verification.email !== normalizedEmail) {
        return NextResponse.json(
          {
            error: "Please verify your email before creating your academy.",
            code: "EMAIL_VERIFICATION_REQUIRED",
          },
          { status: 400 }
        )
      }

      if (!verification.verified) {
        return NextResponse.json(
          {
            error: "Please verify your email before creating your academy.",
            code: "EMAIL_NOT_VERIFIED",
          },
          { status: 400 }
        )
      }
    } else {
      // TEMP: disable email verification for local/dev/demo so academy registration can proceed directly.
      console.info("[register/academy] bypassing email verification", {
        email: normalizedEmail,
        demoMode,
      })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    let result:
      | {
          academy: { id: string; name: string; subdomain: string }
          user: { id: string }
          fallbackUsed: boolean
        }
      | null = null

    for (let attempt = 0; attempt < MAX_SUBDOMAIN_ATTEMPTS; attempt += 1) {
      const candidateSubdomain =
        attempt === 0 ? subdomainBase : buildFallbackSubdomain(subdomainBase, attempt)

      try {
        const transactionResult = await prisma.$transaction(async (tx) => {
          const academy = await tx.academy.create({
            data: {
              name: academyName,
              subdomain: candidateSubdomain,
              contactEmail: normalizedContactEmail,
            },
            select: {
              id: true,
              name: true,
              subdomain: true,
            },
          })

          const user = await tx.user.create({
            data: {
              email: normalizedEmail,
              passwordHash,
              firstName,
              lastName,
              role: "admin",
              isAcademyOwner: true,
              academyId: academy.id,
            },
            select: {
              id: true,
            },
          })

          await tx.emailVerification.deleteMany({
            where: { email: normalizedEmail },
          })

          return { academy, user }
        })

        result = {
          ...transactionResult,
          fallbackUsed: candidateSubdomain !== requestedSubdomain,
        }
        break
      } catch (error) {
        if (isUniqueConstraintError(error) && isSubdomainConflictError(error) && (skipSubdomainCheck || attempt < MAX_SUBDOMAIN_ATTEMPTS - 1)) {
          console.warn("[register/academy] subdomain conflict, retrying with fallback", {
            requestedSubdomain,
            candidateSubdomain,
            attempt,
            demoMode,
            skipSubdomainCheck,
          })
          continue
        }

        throw error
      }
    }

    if (!result) {
      return NextResponse.json(
        {
          error: "Unable to assign a unique academy subdomain right now. Please try again.",
          code: "SUBDOMAIN_ASSIGNMENT_FAILED",
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Academy created successfully",
        code: "ACADEMY_CREATED",
        demoMode,
        fallbackUsed: result.fallbackUsed,
        warning: result.fallbackUsed
          ? `Requested subdomain was unavailable. Assigned fallback subdomain: ${result.academy.subdomain}`
          : skipSubdomainCheck
            ? "Strict subdomain availability checks are currently relaxed."
            : null,
        academy: {
          id: result.academy.id,
          name: result.academy.name,
          subdomain: result.academy.subdomain,
        },
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("[register/academy] failed", {
      demoMode: isDemoModeEnabled(),
      emailVerificationRequired: isEmailVerificationRequired(),
      skipSubdomainCheck: shouldSkipSubdomainCheck(),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
      prisma: formatPrismaError(error),
    })

    if (isPrismaInitializationError(error)) {
      console.error("[database][register/academy] Prisma initialization failure", formatPrismaError(error))

      return NextResponse.json(
        {
          error: "Registration is temporarily unavailable. Please try again shortly.",
          code: "DATABASE_UNAVAILABLE",
          demoMode: isDemoModeEnabled(),
        },
        { status: 503 }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const targets = Array.isArray(error.meta?.target)
        ? error.meta?.target.map(String)
        : typeof error.meta?.target === "string"
          ? [error.meta.target]
          : []

      return NextResponse.json(
        {
          error: targets.includes("email") || targets.includes("users_email_key")
            ? "This email is already registered. Please sign in or use another email."
            : "This email or subdomain is already in use.",
          code: targets.includes("email") || targets.includes("users_email_key")
            ? "EMAIL_ALREADY_REGISTERED"
            : "RESOURCE_CONFLICT",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        code: "REGISTRATION_FAILED",
      },
      { status: 500 }
    )
  }
}
