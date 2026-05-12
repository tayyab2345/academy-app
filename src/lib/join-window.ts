import { SESSION_JOIN_LEAD_MINUTES } from "@/lib/attendance-utils"

export type LiveJoinWindowPhase = "before" | "open" | "ended" | "closed"

export interface LiveJoinWindowState {
  phase: LiveJoinWindowPhase
  canJoin: boolean
  opensAt: Date | null
  startsInMinutes: number | null
}

export function getLiveJoinWindowState(
  session: {
    startTime: Date | string
    endTime: Date | string
    status: string
  },
  now: Date = new Date(),
  leadMinutes: number = SESSION_JOIN_LEAD_MINUTES
): LiveJoinWindowState {
  if (session.status === "cancelled") {
    return {
      phase: "closed",
      canJoin: false,
      opensAt: null,
      startsInMinutes: null,
    }
  }

  const startTime = new Date(session.startTime)
  const endTime = new Date(session.endTime)

  if (
    Number.isNaN(startTime.getTime()) ||
    Number.isNaN(endTime.getTime()) ||
    session.status === "completed" ||
    now.getTime() > endTime.getTime()
  ) {
    return {
      phase: "ended",
      canJoin: false,
      opensAt: null,
      startsInMinutes: null,
    }
  }

  const opensAt = new Date(
    startTime.getTime() - leadMinutes * 60 * 1000
  )

  if (now.getTime() >= opensAt.getTime() && now.getTime() <= endTime.getTime()) {
    return {
      phase: "open",
      canJoin: true,
      opensAt,
      startsInMinutes:
        now.getTime() < startTime.getTime()
          ? Math.ceil((startTime.getTime() - now.getTime()) / 60_000)
          : 0,
    }
  }

  return {
    phase: "before",
    canJoin: false,
    opensAt,
    startsInMinutes: Math.ceil((startTime.getTime() - now.getTime()) / 60_000),
  }
}
