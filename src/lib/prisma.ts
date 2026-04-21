import { Prisma, PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
  prismaDiagnosticsLogged?: boolean
}

function summarizeDatabaseUrl(value: string | undefined) {
  if (!value) {
    return { present: false }
  }

  try {
    const parsed = new URL(value)

    return {
      present: true,
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.host,
      pathname: parsed.pathname,
      sslmode: parsed.searchParams.get("sslmode"),
      pgbouncer: parsed.searchParams.get("pgbouncer"),
      connectionLimit: parsed.searchParams.get("connection_limit"),
    }
  } catch {
    return {
      present: true,
      parseable: false,
    }
  }
}

export function formatPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      name: error.name,
      message: error.message,
      clientVersion: error.clientVersion,
      errorCode: error.errorCode,
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      name: error.name,
      message: error.message,
      clientVersion: error.clientVersion,
      code: error.code,
      meta: error.meta,
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      name: error.name,
      message: error.message,
      clientVersion: error.clientVersion,
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }

  return {
    message: String(error),
  }
}

export function isPrismaInitializationError(error: unknown) {
  return error instanceof Prisma.PrismaClientInitializationError
}

function logPrismaDiagnostics() {
  if (globalForPrisma.prismaDiagnosticsLogged) {
    return
  }

  const databaseUrl = process.env.DATABASE_URL?.trim()
  const directUrl = process.env.DIRECT_URL?.trim()

  console.info("[prisma] runtime environment", {
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: Boolean(databaseUrl),
    hasDirectUrl: Boolean(directUrl),
    databaseUrl: summarizeDatabaseUrl(databaseUrl),
    directUrl: summarizeDatabaseUrl(directUrl),
  })

  if (!databaseUrl) {
    console.error("[prisma] DATABASE_URL is not configured")
  }

  if (!directUrl) {
    console.warn(
      "[prisma] DIRECT_URL is not configured. Supabase migrations/introspection should use a direct connection string."
    )
  }

  globalForPrisma.prismaDiagnosticsLogged = true
}

function createPrismaClient() {
  logPrismaDiagnostics()

  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    })
  } catch (error) {
    console.error("[prisma] failed to create PrismaClient", formatPrismaError(error))
    throw error
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export default prisma
