import { NextRequest, NextResponse } from "next/server"
import {
  recordJobRun,
  shouldRunJob,
  validateInternalApiToken,
} from "@/lib/jobs/job-guards"
import { sendOverdueReminders } from "@/lib/jobs/reminder-jobs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getInternalToken(req: NextRequest) {
  const authorization = req.headers.get("authorization")

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length)
  }

  return req.headers.get("x-internal-api-token")
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.INTERNAL_API_TOKEN) {
      return NextResponse.json(
        { error: "INTERNAL_API_TOKEN is not configured" },
        { status: 503 }
      )
    }

    const token = getInternalToken(req)

    if (!validateInternalApiToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const guard = await shouldRunJob("overdue_reminder")

    if (!guard.shouldRun) {
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          reason: "Job recently ran",
          lastRun: guard.lastRun?.toISOString() || null,
          nextAllowedRun: guard.nextAllowedRun.toISOString(),
          timestamp: new Date().toISOString(),
        },
        { status: 202 }
      )
    }

    await recordJobRun("overdue_reminder", "started", {
      triggeredAt: new Date().toISOString(),
    })

    const result = await sendOverdueReminders()

    await recordJobRun("overdue_reminder", "completed", result)

    return NextResponse.json({
      success: true,
      jobName: "overdue_reminder",
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to run overdue reminder job:", error)

    await recordJobRun("overdue_reminder", "failed", {
      error: error instanceof Error ? error.message : "Unknown job failure",
    })

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run reminder job",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
