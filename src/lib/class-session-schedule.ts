import { prisma } from "@/lib/prisma"
import {
  buildDateTimeFromDateInputAndTime,
  hasConfiguredClassSchedule,
  parseClassScheduleTimeParts,
  sortClassScheduleDays,
} from "@/lib/class-schedule"
import {
  addDaysToDateInput,
  formatDateInputInTimeZone,
  getWeekdayFromDateInput,
  maxDateInput,
  minDateInput,
  resolveAcademyTimeZone,
} from "@/lib/time-zone"

const DEFAULT_SYNC_DAYS_BACK = 14
const DEFAULT_SYNC_DAYS_AHEAD = 60
const DEFAULT_SYNC_CONCURRENCY = 3

type SyncRecurringSessionsOptions = {
  daysBack?: number
  daysAhead?: number
  concurrency?: number
  now?: Date
}

type SchedulableClass = {
  id: string
  name: string
  startDate: Date | null
  endDate: Date | null
  scheduleDays: string[]
  scheduleStartTime: string | null
  scheduleEndTime: string | null
  defaultMeetingPlatform: "zoom" | "google_meet" | "teams" | "in_person"
  academy: {
    timezone: string
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getAutoSessionStatus(startTime: Date, endTime: Date, now: Date) {
  if (now > endTime) {
    return "completed" as const
  }

  if (now >= startTime && now <= endTime) {
    return "ongoing" as const
  }

  return "scheduled" as const
}

function buildGeneratedSessionData(
  classData: SchedulableClass,
  dateInput: string,
  now: Date,
  timeZone: string
) {
  const sessionDate = buildDateTimeFromDateInputAndTime(
    dateInput,
    "00:00",
    0,
    0,
    timeZone
  )
  const startTime = buildDateTimeFromDateInputAndTime(
    dateInput,
    classData.scheduleStartTime,
    9,
    0,
    timeZone
  )
  const startTimeParts =
    parseClassScheduleTimeParts(classData.scheduleStartTime) || {
      hours: 9,
      minutes: 0,
    }
  const endTime = buildDateTimeFromDateInputAndTime(
    dateInput,
    classData.scheduleEndTime,
    Math.min(startTimeParts.hours + 1, 23),
    startTimeParts.minutes,
    timeZone
  )

  return {
    sessionDate,
    startTime,
    endTime,
    meetingPlatform: classData.defaultMeetingPlatform,
    meetingLink: null,
    generatedFromSchedule: true,
    status: getAutoSessionStatus(startTime, endTime, now),
    title: null,
  }
}

async function getSchedulableClass(classId: string) {
  return prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      scheduleDays: true,
      scheduleStartTime: true,
      scheduleEndTime: true,
      defaultMeetingPlatform: true,
      academy: {
        select: {
          timezone: true,
        },
      },
    },
  })
}

export async function syncRecurringSessionsForClass(
  classId: string,
  options: SyncRecurringSessionsOptions = {}
) {
  const classData = await getSchedulableClass(classId)

  if (!classData) {
    return { created: 0, updated: 0, deleted: 0 }
  }

  const now = options.now ?? new Date()
  const daysBack = options.daysBack ?? DEFAULT_SYNC_DAYS_BACK
  const daysAhead = options.daysAhead ?? DEFAULT_SYNC_DAYS_AHEAD
  const timeZone = resolveAcademyTimeZone(classData.academy.timezone)
  const syncWindowStartInput = formatDateInputInTimeZone(
    addDays(now, -daysBack),
    timeZone
  )
  const syncWindowEndInput = formatDateInputInTimeZone(
    addDays(now, daysAhead),
    timeZone
  )
  const syncWindowStart = buildDateTimeFromDateInputAndTime(
    syncWindowStartInput,
    "00:00",
    0,
    0,
    timeZone
  )
  const syncWindowEnd = buildDateTimeFromDateInputAndTime(
    syncWindowEndInput,
    "23:59",
    23,
    59,
    timeZone
  )

  const existingSessions = await prisma.classSession.findMany({
    where: {
      classId,
      sessionDate: {
        gte: syncWindowStart,
        lte: syncWindowEnd,
      },
    },
    select: {
      id: true,
      sessionDate: true,
      startTime: true,
      endTime: true,
      meetingPlatform: true,
      meetingLink: true,
      status: true,
      generatedFromSchedule: true,
      _count: {
        select: {
          attendances: true,
          teacherJoins: true,
        },
      },
    },
    orderBy: {
      startTime: "asc",
    },
  })

  const existingByDate = new Map<
    string,
    Array<(typeof existingSessions)[number]>
  >()

  for (const session of existingSessions) {
    const dateKey = formatDateInputInTimeZone(session.sessionDate, timeZone)
    const rows = existingByDate.get(dateKey) || []
    rows.push(session)
    existingByDate.set(dateKey, rows)
  }

  const desiredDateMap = new Map<
    string,
    ReturnType<typeof buildGeneratedSessionData>
  >()

  if (hasConfiguredClassSchedule(classData)) {
    const classStartInput = classData.startDate
      ? formatDateInputInTimeZone(classData.startDate, timeZone)
      : syncWindowStartInput
    const classEndInput = classData.endDate
      ? formatDateInputInTimeZone(classData.endDate, timeZone)
      : syncWindowEndInput
    const effectiveStartInput = maxDateInput(classStartInput, syncWindowStartInput)
    const effectiveEndInput = minDateInput(classEndInput, syncWindowEndInput)
    const scheduleDaySet = new Set(sortClassScheduleDays(classData.scheduleDays))

    for (
      let dateInput = effectiveStartInput;
      dateInput <= effectiveEndInput;
      dateInput = addDaysToDateInput(dateInput, 1)
    ) {
      const weekday = getWeekdayFromDateInput(dateInput)

      if (!scheduleDaySet.has(weekday)) {
        continue
      }

      desiredDateMap.set(
        dateInput,
        buildGeneratedSessionData(classData, dateInput, now, timeZone)
      )
    }
  }

  const createOperations = []
  const updateOperations = []
  const deleteOperations = []

  for (const [dateKey, desiredSession] of desiredDateMap) {
    const existingForDate = existingByDate.get(dateKey) || []
    const manualSessionExists = existingForDate.some(
      (session) => !session.generatedFromSchedule
    )

    if (manualSessionExists) {
      for (const session of existingForDate) {
        if (
          session.generatedFromSchedule &&
          session._count.attendances === 0 &&
          session._count.teacherJoins === 0
        ) {
          deleteOperations.push(
            prisma.classSession.delete({
              where: { id: session.id },
            })
          )
        }
      }

      continue
    }

    const generatedSession = existingForDate.find(
      (session) => session.generatedFromSchedule
    )

    if (!generatedSession) {
      createOperations.push(
        prisma.classSession.create({
          data: {
            classId,
            ...desiredSession,
          },
        })
      )
      continue
    }

    const needsUpdate =
      generatedSession.startTime.getTime() !== desiredSession.startTime.getTime() ||
      generatedSession.endTime.getTime() !== desiredSession.endTime.getTime() ||
      generatedSession.sessionDate.getTime() !== desiredSession.sessionDate.getTime() ||
      generatedSession.meetingPlatform !== desiredSession.meetingPlatform ||
      generatedSession.meetingLink !== desiredSession.meetingLink ||
      generatedSession.status !== desiredSession.status

    if (needsUpdate) {
      updateOperations.push(
        prisma.classSession.update({
          where: { id: generatedSession.id },
          data: desiredSession,
        })
      )
    }
  }

  for (const session of existingSessions) {
    if (!session.generatedFromSchedule) {
      continue
    }

    const dateKey = formatDateInputInTimeZone(session.sessionDate, timeZone)
    const shouldExist = desiredDateMap.has(dateKey)
    const hasJoinOrAttendance =
      session._count.attendances > 0 || session._count.teacherJoins > 0

    if (!shouldExist && !hasJoinOrAttendance) {
      deleteOperations.push(
        prisma.classSession.delete({
          where: { id: session.id },
        })
      )
    }
  }

  const operations = [
    ...createOperations,
    ...updateOperations,
    ...deleteOperations,
  ]

  if (operations.length > 0) {
    await prisma.$transaction(operations)
  }

  return {
    created: createOperations.length,
    updated: updateOperations.length,
    deleted: deleteOperations.length,
  }
}

export async function syncRecurringSessionsForClasses(
  classIds: string[],
  options: SyncRecurringSessionsOptions = {}
) {
  const uniqueClassIds = [...new Set(classIds.filter(Boolean))]
  const concurrency = Math.min(
    Math.max(options.concurrency ?? DEFAULT_SYNC_CONCURRENCY, 1),
    uniqueClassIds.length || 1
  )
  const results: Array<{ created: number; updated: number; deleted: number }> = []
  let nextIndex = 0

  async function worker() {
    while (nextIndex < uniqueClassIds.length) {
      const classId = uniqueClassIds[nextIndex]
      nextIndex += 1

      results.push(await syncRecurringSessionsForClass(classId, options))
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  return results.reduce(
    (summary, result) => ({
      created: summary.created + result.created,
      updated: summary.updated + result.updated,
      deleted: summary.deleted + result.deleted,
    }),
    { created: 0, updated: 0, deleted: 0 }
  )
}
