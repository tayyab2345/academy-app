import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

interface JobRunResult {
  shouldRun: boolean
  lastRun: Date | null
  nextAllowedRun: Date
}

const JOB_INTERVALS: Record<string, number> = {
  overdue_reminder: 24 * 60 * 60 * 1000,
  draft_report_reminder: 3 * 24 * 60 * 60 * 1000,
}

export async function shouldRunJob(jobName: string): Promise<JobRunResult> {
  const interval = JOB_INTERVALS[jobName] || 24 * 60 * 60 * 1000

  const lastRun = await prisma.systemJobLog.findFirst({
    where: {
      jobName,
      status: "completed",
    },
    orderBy: {
      startedAt: "desc",
    },
  })

  const now = new Date()
  const lastRunAt = lastRun?.completedAt || lastRun?.startedAt || null
  const nextAllowedRun = lastRun
    ? new Date((lastRunAt || now).getTime() + interval)
    : now

  return {
    shouldRun: !lastRun || now >= nextAllowedRun,
    lastRun: lastRunAt,
    nextAllowedRun,
  }
}

function getNumericDetailValue(
  details: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (!details) {
    return 0
  }

  for (const key of keys) {
    const value = details[key]

    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
  }

  return 0
}

export async function recordJobRun(
  jobName: string,
  status: "started" | "completed" | "failed",
  details?: Record<string, unknown>
) {
  const metadata = (details || {}) as Prisma.InputJsonValue
  const itemsProcessed = getNumericDetailValue(details, ["processed", "itemsProcessed"])
  const itemsSucceeded = getNumericDetailValue(details, [
    "sent",
    "itemsSucceeded",
    "succeeded",
  ])
  const itemsFailed = getNumericDetailValue(details, [
    "failed",
    "errors",
    "itemsFailed",
  ])

  if (status === "started") {
    await prisma.systemJobLog.create({
      data: {
        jobName,
        status,
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        metadata,
      },
    })
    return
  }

  const existingRun = await prisma.systemJobLog.findFirst({
    where: {
      jobName,
      status: "started",
    },
    orderBy: {
      startedAt: "desc",
    },
  })

  if (existingRun) {
    await prisma.systemJobLog.update({
      where: { id: existingRun.id },
      data: {
        status,
        completedAt: new Date(),
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        errorMessage:
          status === "failed" ? String(details?.error || "Job failed") : null,
        metadata,
      },
    })
    return
  }

  await prisma.systemJobLog.create({
      data: {
        jobName,
        status,
        completedAt: new Date(),
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        errorMessage:
          status === "failed" ? String(details?.error || "Job failed") : null,
        metadata,
      },
    })
}

export function validateInternalApiToken(token: string | null) {
  if (!token || !process.env.INTERNAL_API_TOKEN) {
    return false
  }

  return token === process.env.INTERNAL_API_TOKEN
}
