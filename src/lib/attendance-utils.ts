export interface AttendanceCalculation {
  status: "present" | "late" | "absent"
  lateMinutes: number
}

export interface SessionJoinCalculation {
  status: "on_time" | "late"
  lateMinutes: number
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
  actualJoinTime: Date
): SessionJoinCalculation {
  const diffMs = actualJoinTime.getTime() - scheduledStartTime.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)))

  if (diffMinutes > 0) {
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
