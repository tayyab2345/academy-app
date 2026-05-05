type SessionLike = {
  sessionDate?: Date | string | null
  startTime: Date | string
  endTime: Date | string
  status: string
}

const RELEVANT_SESSION_STATUSES = new Set(["scheduled", "ongoing", "completed"])

export function getStartOfLocalDay(date: Date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

export function getEndOfLocalDay(date: Date = new Date()) {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

export function isSameLocalDay(left: Date | string, right: Date | string) {
  const leftDate = new Date(left)
  const rightDate = new Date(right)

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  )
}

export function getRelevantClassSession<T extends SessionLike>(
  sessions: T[],
  now: Date = new Date()
): T | null {
  const sortedSessions = [...sessions]
    .filter((session) => RELEVANT_SESSION_STATUSES.has(session.status))
    .sort(
      (left, right) =>
        new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
    )

  const todaySessions = sortedSessions.filter((session) =>
    isSameLocalDay(session.sessionDate || session.startTime, now)
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

export function formatSessionDayName(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
  })
}

export function getJoinOpensMessage(leadMinutes: number) {
  return `Join opens ${leadMinutes} minutes before class`
}
