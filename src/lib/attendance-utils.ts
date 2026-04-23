export interface AttendanceCalculation {
  status: "present" | "late" | "absent"
  lateMinutes: number
}

export interface SessionJoinCalculation {
  status: "on_time" | "late"
  lateMinutes: number
}

export interface SessionMeetingSettingsInput {
  sessionMeetingPlatform?: string | null
  sessionMeetingLink?: string | null
  classMeetingPlatform?: string | null
  classMeetingLink?: string | null
}

export interface EffectiveSessionMeetingSettings {
  platform: string
  link: string | null
  inheritedFromClass: boolean
}

export const LATE_THRESHOLD_MINUTES = 5

export function calculateAttendanceStatus(
  scheduledStartTime: Date,
  actualJoinTime: Date | null,
  lateThreshold: number = LATE_THRESHOLD_MINUTES
): AttendanceCalculation {
  if (!actualJoinTime) {
    return {
      status: "absent",
      lateMinutes: 0,
    }
  }

  const diffMs = actualJoinTime.getTime() - scheduledStartTime.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes <= lateThreshold) {
    return {
      status: "present",
      lateMinutes: 0,
    }
  }

  return {
    status: "late",
    lateMinutes: diffMinutes,
  }
}

export function calculateSessionJoinStatus(
  scheduledStartTime: Date,
  actualJoinTime: Date,
  lateThreshold: number = 0
): SessionJoinCalculation {
  const diffMs = actualJoinTime.getTime() - scheduledStartTime.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)))

  if (diffMinutes > lateThreshold) {
    return {
      status: "late",
      lateMinutes: diffMinutes,
    }
  }

  return {
    status: "on_time",
    lateMinutes: 0,
  }
}

export function formatLateThresholdLabel(lateThresholdMinutes: number) {
  if (lateThresholdMinutes <= 0) {
    return "Any delay counts as late"
  }

  return `Late after ${lateThresholdMinutes} minute${
    lateThresholdMinutes === 1 ? "" : "s"
  }`
}

export function getMeetingPlatformLabel(platform: string | null | undefined) {
  switch (platform) {
    case "zoom":
      return "Zoom"
    case "google_meet":
      return "Google Meet"
    case "teams":
      return "Microsoft Teams"
    case "in_person":
      return "In Person"
    default:
      return platform || "Not set"
  }
}

export function getEffectiveSessionMeetingSettings(
  input: SessionMeetingSettingsInput
): EffectiveSessionMeetingSettings {
  const sessionMeetingPlatform = input.sessionMeetingPlatform || "in_person"
  const sessionMeetingLink = input.sessionMeetingLink || null
  const classMeetingPlatform = input.classMeetingPlatform || "in_person"
  const classMeetingLink = input.classMeetingLink || null

  if (sessionMeetingLink) {
    return {
      platform: sessionMeetingPlatform,
      link: sessionMeetingLink,
      inheritedFromClass: false,
    }
  }

  if (sessionMeetingPlatform !== "in_person") {
    if (classMeetingPlatform === sessionMeetingPlatform && classMeetingLink) {
      return {
        platform: sessionMeetingPlatform,
        link: classMeetingLink,
        inheritedFromClass: true,
      }
    }

    return {
      platform: sessionMeetingPlatform,
      link: null,
      inheritedFromClass: false,
    }
  }

  return {
    platform: sessionMeetingPlatform,
    link: null,
    inheritedFromClass: false,
  }
}

export function formatSessionTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatSessionDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function isSessionActive(session: {
  startTime: Date
  endTime: Date
  status: string
}): boolean {
  if (session.status === "cancelled" || session.status === "completed") {
    return false
  }

  const now = new Date()
  return now >= session.startTime && now <= session.endTime
}

export function isSessionUpcoming(session: {
  startTime: Date
  status: string
}): boolean {
  if (session.status === "cancelled" || session.status === "completed") {
    return false
  }

  return new Date() < session.startTime
}

export function isSessionPast(session: {
  endTime: Date
  status: string
}): boolean {
  if (session.status === "cancelled") {
    return false
  }

  return new Date() > session.endTime || session.status === "completed"
}

export function getAttendanceStatusBadge(status: string): {
  label: string
  variant: string
} {
  const statusMap: Record<string, { label: string; variant: string }> = {
    present: { label: "Present", variant: "success" },
    absent: { label: "Absent", variant: "destructive" },
    late: { label: "Late", variant: "warning" },
    excused: { label: "Excused", variant: "secondary" },
  }

  return statusMap[status] || { label: status, variant: "default" }
}

export function getSessionStatusBadge(status: string): {
  label: string
  variant: string
} {
  const statusMap: Record<string, { label: string; variant: string }> = {
    scheduled: { label: "Scheduled", variant: "secondary" },
    ongoing: { label: "Ongoing", variant: "success" },
    completed: { label: "Completed", variant: "default" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  }

  return statusMap[status] || { label: status, variant: "default" }
}

export function getSessionJoinStatusBadge(status: string): {
  label: string
  variant: string
} {
  const statusMap: Record<string, { label: string; variant: string }> = {
    on_time: { label: "On Time", variant: "success" },
    late: { label: "Late Join", variant: "warning" },
  }

  return statusMap[status] || { label: status, variant: "default" }
}
