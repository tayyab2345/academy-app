import { NextRequest, NextResponse } from "next/server"
import {
  recordJobRun,
  shouldRunJob,
  validateInternalApiToken,
} from "@/lib/jobs/job-guards"
import {
  sendClassStartReminders,
  sendOverdueReminders,
} from "@/lib/jobs/reminder-jobs"

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

    const [overdueGuard, classReminderGuard] = await Promise.all([
      shouldRunJob("overdue_reminder"),
      shouldRunJob("class_reminder"),
    ])

    let overdueResult:
      | Awaited<ReturnType<typeof sendOverdueReminders>>
      | { skipped: true; nextAllowedRun: string }
    let classReminderResult:
      | Awaited<ReturnType<typeof sendClassStartReminders>>
      | { skipped: true; nextAllowedRun: string }

    if (overdueGuard.shouldRun) {
      await recordJobRun("overdue_reminder", "started", {
        triggeredAt: new Date().toISOString(),
      })
      overdueResult = await sendOverdueReminders()
      await recordJobRun("overdue_reminder", "completed", overdueResult)
    } else {
      overdueResult = {
        skipped: true,
        nextAllowedRun: overdueGuard.nextAllowedRun.toISOString(),
      }
    }

    if (classReminderGuard.shouldRun) {
      await recordJobRun("class_reminder", "started", {
        triggeredAt: new Date().toISOString(),
      })
      classReminderResult = await sendClassStartReminders()
      await recordJobRun("class_reminder", "completed", classReminderResult)
    } else {
      classReminderResult = {
        skipped: true,
        nextAllowedRun: classReminderGuard.nextAllowedRun.toISOString(),
      }
    }

    return NextResponse.json({
      success: true,
      jobName: "reminders",
      overdueReminder: overdueResult,
      classReminder: classReminderResult,
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
