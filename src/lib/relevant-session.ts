import {
  formatDateInputInTimeZone,
  formatDayNameInTimeZone,
  zonedDateTimeToUtc,
} from "@/lib/time-zone"

type SessionLike = {
  sessionDate?: Date | string | null
  startTime: Date | string
  endTime: Date | string
  status: string
}

const RELEVANT_SESSION_STATUSES = new Set(["scheduled", "ongoing", "completed"])

export function getStartOfLocalDay(
  date: Date = new Date(),
  timeZone?: string | null
) {
  const dateInput = formatDateInputInTimeZone(date, timeZone)

  return zonedDateTimeToUtc({
    dateInput,
    hours: 0,
    minutes: 0,
    timeZone,
  })
}

export function getEndOfLocalDay(
  date: Date = new Date(),
  timeZone?: string | null
) {
  const dateInput = formatDateInputInTimeZone(date, timeZone)
  const end = zonedDateTimeToUtc({
    dateInput,
    hours: 23,
    minutes: 59,
    timeZone,
  })

  return new Date(end.getTime() + 59_999)
}

export function isSameLocalDay(
  left: Date | string,
  right: Date | string,
  timeZone?: string | null
) {
  return (
    formatDateInputInTimeZone(new Date(left), timeZone) ===
    formatDateInputInTimeZone(new Date(right), timeZone)
  )
}

export function getRelevantClassSession<T extends SessionLike>(
  sessions: T[],
  now: Date = new Date(),
  timeZone?: string | null
): T | null {
  const sortedSessions = [...sessions]
    .filter((session) => RELEVANT_SESSION_STATUSES.has(session.status))
    .sort(
      (left, right) =>
        new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
    )

  const todaySessions = sortedSessions.filter((session) =>
    isSameLocalDay(session.sessionDate || session.startTime, now, timeZone)
  )

  if (todaySessions.length > 0) {
    const activeOrUpcomingToday = todaySessions.find(
      (session) =>
        session.status === "ongoing" || new Date(session.endTime).getTime() >= now.getTime()
    )

    return activeOrUpcomingToday || todaySessions[0]
  }

  return (
    sortedSessions.find(
      (session) =>
        session.status !== "completed" &&
        new Date(session.endTime).getTime() >= now.getTime()
    ) || null
  )
}

export function formatSessionDayName(
  date: Date | string,
  timeZone?: string | null
) {
  return formatDayNameInTimeZone(new Date(date), timeZone)
}

export function getJoinOpensMessage(leadMinutes: number) {
  return `Join opens ${leadMinutes} minutes before class`
}
