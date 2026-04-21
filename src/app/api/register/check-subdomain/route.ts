import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { formatPrismaError, prisma } from "@/lib/prisma"
import { isDemoModeEnabled, shouldSkipSubdomainCheck } from "@/lib/runtime-flags"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const subdomain = searchParams.get("subdomain")?.trim().toLowerCase()

  if (!subdomain || subdomain.length < 3) {
    return NextResponse.json(
      { error: "Invalid subdomain" },
      { status: 400 }
    )
  }

  // Validate subdomain format
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return NextResponse.json(
      { available: false, error: "Invalid characters" },
      { status: 200 }
    )
  }

  if (shouldSkipSubdomainCheck()) {
    return NextResponse.json({
      available: true,
      checked: false,
      code: "CHECK_SKIPPED",
      warning: isDemoModeEnabled()
        ? "Demo mode is enabled. A fallback subdomain will be assigned during registration if needed."
        : "Subdomain check is temporarily unavailable. A fallback subdomain will be assigned during registration if needed.",
    })
  }

  try {
    const existingAcademy = await prisma.academy.findFirst({
      where: { subdomain },
      select: { id: true },
    })

    return NextResponse.json({
      available: !existingAcademy,
      checked: true,
      code: existingAcademy ? "SUBDOMAIN_CONFLICT" : "SUBDOMAIN_AVAILABLE",
      warning: existingAcademy
        ? "Requested subdomain is already in use. A fallback subdomain will be assigned during registration."
        : null,
    })
  } catch (error) {
    const formattedError = formatPrismaError(error)

    console.error("[database][register/check-subdomain] failed", {
      subdomain,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
      prisma: formattedError,
    })

    const status =
      error instanceof Prisma.PrismaClientInitializationError ? 503 : 500

    return NextResponse.json(
      {
        available: true,
        checked: false,
        code: "DATABASE_UNAVAILABLE",
        warning: "Subdomain check is temporarily unavailable. A fallback subdomain will be assigned during registration if needed.",
        error: "DATABASE_UNAVAILABLE",
      },
      { status }
    )
  }
}
