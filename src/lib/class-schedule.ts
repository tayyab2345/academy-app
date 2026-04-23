export const CLASS_WEEKDAY_VALUES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

export type ClassWeekdayValue = (typeof CLASS_WEEKDAY_VALUES)[number]

export const CLASS_RECURRENCE_VALUES = ["weekly", "custom"] as const

export type ClassRecurrenceValue = (typeof CLASS_RECURRENCE_VALUES)[number]

const weekdayOrder = new Map(
  CLASS_WEEKDAY_VALUES.map((day, index) => [day, index] as const)
)

const shortWeekdayLabels: Record<ClassWeekdayValue, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

const longWeekdayLabels: Record<ClassWeekdayValue, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

export type ClassScheduleShape = {
  scheduleDays?: readonly string[] | null
  scheduleStartTime?: string | null
  scheduleEndTime?: string | null
  scheduleRecurrence?: string | null
}

export function isClassWeekday(value: string): value is ClassWeekdayValue {
  return CLASS_WEEKDAY_VALUES.includes(value as ClassWeekdayValue)
}

export function sortClassScheduleDays(
  days: readonly string[] | null | undefined
) {
  return Array.from(new Set((days || []).filter(isClassWeekday))).sort(
    (left, right) => {
      return (weekdayOrder.get(left) ?? 0) - (weekdayOrder.get(right) ?? 0)
    }
  )
}

export function hasConfiguredClassSchedule(schedule: ClassScheduleShape) {
  return (
    sortClassScheduleDays(schedule.scheduleDays).length > 0 &&
    Boolean(schedule.scheduleStartTime) &&
    Boolean(schedule.scheduleEndTime)
  )
}

export function getClassWeekdayLabel(
  day: string,
  format: "short" | "long" = "short"
) {
  if (!isClassWeekday(day)) {
    return day
  }

  return format === "long" ? longWeekdayLabels[day] : shortWeekdayLabels[day]
}

function parseTimeParts(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value)

  if (!match) {
    return null
  }

  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)

  if (hours > 23 || minutes > 59) {
    return null
  }

  return { hours, minutes }
}

export function formatClassScheduleTime(value: string | null | undefined) {
  const parts = parseTimeParts(value)

  if (!parts) {
    return value || null
  }

  const period = parts.hours >= 12 ? "PM" : "AM"
  const displayHour = parts.hours % 12 || 12
  const paddedMinutes = parts.minutes.toString().padStart(2, "0")

  return `${displayHour}:${paddedMinutes} ${period}`
}

export function formatClassScheduleTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined
) {
  const formattedStart = formatClassScheduleTime(startTime)
  const formattedEnd = formatClassScheduleTime(endTime)

  if (!formattedStart || !formattedEnd) {
    return null
  }

  return `${formattedStart} - ${formattedEnd}`
}

export function getClassRecurrenceLabel(
  recurrence: string | null | undefined
) {
  if (recurrence === "custom") {
    return "Custom recurring pattern"
  }

  return "Weekly recurring class"
}

export function getClassScheduleSummaryText(schedule: ClassScheduleShape) {
  if (!hasConfiguredClassSchedule(schedule)) {
    return "Recurring schedule not configured yet."
  }

  const dayText = sortClassScheduleDays(schedule.scheduleDays)
    .map((day) => getClassWeekdayLabel(day, "short"))
    .join(", ")
  const timeText = formatClassScheduleTimeRange(
    schedule.scheduleStartTime,
    schedule.scheduleEndTime
  )

  return timeText ? `${dayText} - ${timeText}` : dayText
}

export function buildDateTimeFromDateInputAndTime(
  dateInput: string,
  timeInput: string | null | undefined,
  fallbackHour: number,
  fallbackMinute: number = 0
) {
  const parsedTime = parseTimeParts(timeInput)

  if (parsedTime) {
    return new Date(
      `${dateInput}T${parsedTime.hours.toString().padStart(2, "0")}:${parsedTime.minutes
        .toString()
        .padStart(2, "0")}:00`
    )
  }

  return new Date(
    `${dateInput}T${fallbackHour.toString().padStart(2, "0")}:${fallbackMinute
      .toString()
      .padStart(2, "0")}:00`
  )
}
