import { resolveAcademyTimeZone } from "@/lib/time-zone"

const FRIENDLY_TIME_ZONE_LABELS: Record<string, string> = {
  "Asia/Karachi": "Pakistan Time",
  "Europe/Oslo": "Norway Time",
}

export function getReadableTimeZoneLabel(timeZone?: string | null) {
  const resolvedTimeZone = resolveAcademyTimeZone(timeZone)

  return (
    FRIENDLY_TIME_ZONE_LABELS[resolvedTimeZone] ||
    resolvedTimeZone.replaceAll("_", " ")
  )
}

export function safeResolveBrowserTimeZone(timeZone?: string | null) {
  if (!timeZone) {
    return null
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date())
    return timeZone
  } catch {
    return null
  }
}

export function formatTimeOnlyInZone(
  date: Date | string,
  timeZone?: string | null
) {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }
  const resolvedTimeZone = timeZone ? safeResolveBrowserTimeZone(timeZone) : null

  return new Date(date).toLocaleTimeString("en-US", {
    ...options,
    ...(resolvedTimeZone ? { timeZone: resolvedTimeZone } : {}),
  })
}

export function formatDateTimeRangeInZone(input: {
  startTime: Date | string
  endTime?: Date | string | null
  timeZone?: string | null
}) {
  const start = new Date(input.startTime)
  const end = input.endTime ? new Date(input.endTime) : null
  const resolvedTimeZone = input.timeZone
    ? safeResolveBrowserTimeZone(input.timeZone)
    : null
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }
  const dateTimeFormatOptions = {
    ...dateOptions,
    ...(resolvedTimeZone ? { timeZone: resolvedTimeZone } : {}),
  }
  const startDateLabel = start.toLocaleDateString(
    "en-US",
    dateTimeFormatOptions
  )
  const startTimeLabel = formatTimeOnlyInZone(start, resolvedTimeZone)

  if (!end || Number.isNaN(end.getTime())) {
    return `${startDateLabel} at ${startTimeLabel}`
  }

  const endDateLabel = end.toLocaleDateString("en-US", dateTimeFormatOptions)
  const endTimeLabel = formatTimeOnlyInZone(end, resolvedTimeZone)

  if (startDateLabel === endDateLabel) {
    return `${startDateLabel}, ${startTimeLabel} - ${endTimeLabel}`
  }

  return `${startDateLabel}, ${startTimeLabel} - ${endDateLabel}, ${endTimeLabel}`
}
