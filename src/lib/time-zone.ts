const timeZoneEnv =
  typeof process !== "undefined" ? process.env : ({} as NodeJS.ProcessEnv)

const FALLBACK_ACADEMY_TIME_ZONE =
  timeZoneEnv.ACADEMY_DEFAULT_TIMEZONE ||
  timeZoneEnv.DEFAULT_TIMEZONE ||
  "Asia/Karachi"

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export function resolveAcademyTimeZone(timeZone?: string | null) {
  // Most existing academies were created before timezone settings were exposed,
  // so the schema default "UTC" should fall back to the academy's app timezone.
  const candidate =
    timeZone && timeZone !== "UTC" ? timeZone : FALLBACK_ACADEMY_TIME_ZONE

  try {
    Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return FALLBACK_ACADEMY_TIME_ZONE
  }
}

function getDateTimeParts(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)

  const valueByType = new Map(parts.map((part) => [part.type, part.value]))

  return {
    year: Number(valueByType.get("year")),
    month: Number(valueByType.get("month")),
    day: Number(valueByType.get("day")),
    hour: Number(valueByType.get("hour")),
    minute: Number(valueByType.get("minute")),
    second: Number(valueByType.get("second")),
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getDateTimeParts(date, timeZone)
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  return zonedAsUtc - date.getTime()
}

export function zonedDateTimeToUtc(input: {
  dateInput: string
  hours: number
  minutes: number
  timeZone?: string | null
}) {
  const [year, month, day] = input.dateInput.split("-").map(Number)
  const resolvedTimeZone = resolveAcademyTimeZone(input.timeZone)
  const localAsUtc = new Date(
    Date.UTC(year, month - 1, day, input.hours, input.minutes, 0, 0)
  )
  const firstOffset = getTimeZoneOffsetMs(localAsUtc, resolvedTimeZone)
  let utcDate = new Date(localAsUtc.getTime() - firstOffset)
  const secondOffset = getTimeZoneOffsetMs(utcDate, resolvedTimeZone)

  if (secondOffset !== firstOffset) {
    utcDate = new Date(localAsUtc.getTime() - secondOffset)
  }

  return utcDate
}

export function formatDateInputInTimeZone(
  date: Date,
  timeZone?: string | null
) {
  const resolvedTimeZone = resolveAcademyTimeZone(timeZone)
  const parts = getDateTimeParts(date, resolvedTimeZone)

  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`
}

export function formatDateTimeLocalInputInTimeZone(
  date: Date,
  timeZone?: string | null
) {
  const resolvedTimeZone = resolveAcademyTimeZone(timeZone)
  const parts = getDateTimeParts(date, resolvedTimeZone)

  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day
    .toString()
    .padStart(2, "0")}T${parts.hour.toString().padStart(2, "0")}:${parts.minute
    .toString()
    .padStart(2, "0")}`
}

export function dateTimeInputToUtc(
  value: Date | string,
  timeZone?: string | null
) {
  if (value instanceof Date) {
    return value
  }

  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return new Date(Number.NaN)
  }

  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmedValue)) {
    return new Date(trimmedValue)
  }

  const [dateInput, timeInput = "00:00"] = trimmedValue.split("T")
  const timeMatch = /^(\d{2}):(\d{2})/.exec(timeInput)

  return zonedDateTimeToUtc({
    dateInput,
    hours: timeMatch ? Number(timeMatch[1]) : 0,
    minutes: timeMatch ? Number(timeMatch[2]) : 0,
    timeZone,
  })
}

export function addDaysToDateInput(dateInput: string, days: number) {
  const [year, month, day] = dateInput.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0))

  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(
    date.getUTCMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`
}

export function getWeekdayFromDateInput(dateInput: string) {
  const [year, month, day] = dateInput.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
  const weekdayMap = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const

  return weekdayMap[date.getUTCDay()]
}

export function maxDateInput(left: string, right: string) {
  return left >= right ? left : right
}

export function minDateInput(left: string, right: string) {
  return left <= right ? left : right
}

export function formatTimeInTimeZone(date: Date, timeZone?: string | null) {
  return date.toLocaleTimeString("en-US", {
    timeZone: resolveAcademyTimeZone(timeZone),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatDateInTimeZone(date: Date, timeZone?: string | null) {
  return date.toLocaleDateString("en-US", {
    timeZone: resolveAcademyTimeZone(timeZone),
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDayNameInTimeZone(date: Date, timeZone?: string | null) {
  return date.toLocaleDateString("en-US", {
    timeZone: resolveAcademyTimeZone(timeZone),
    weekday: "long",
  })
}
