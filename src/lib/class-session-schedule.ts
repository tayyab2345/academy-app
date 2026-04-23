import { prisma } from "@/lib/prisma"
import {
  buildDateTimeFromDateInputAndTime,
  hasConfiguredClassSchedule,
  sortClassScheduleDays,
} from "@/lib/class-schedule"

const DEFAULT_SYNC_DAYS_BACK = 14
const DEFAULT_SYNC_DAYS_AHEAD = 60

type SyncRecurringSessionsOptions = {
  daysBack?: number
  daysAhead?: number
  now?: Date
}

type SchedulableClass = {
  id: string
  name: string
  startDate: Date
  endDate: Date
  scheduleDays: string[]
  scheduleStartTime: string | null
  scheduleEndTime: string | null
  defaultMeetingPlatform: "zoom" | "google_meet" | "teams" | "in_person"
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getWeekdayValue(date: Date) {
  const weekdayMap = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const

  return weekdayMap[date.getDay()]
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

function buildGeneratedSessionData(classData: SchedulableClass, date: Date, now: Date) {
  const dateInput = formatDateInput(date)
  const sessionDate = new Date(`${dateInput}T00:00:00`)
  const startTime = buildDateTimeFromDateInputAndTime(
    dateInput,
    classData.scheduleStartTime,
    9,
    0
  )
  const endTime = buildDateTimeFromDateInputAndTime(
    dateInput,
    classData.scheduleEndTime,
    startTime.getHours() + 1,
    startTime.getMinutes()
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
  const syncWindowStart = startOfDay(addDays(now, -daysBack))
  const syncWindowEnd = endOfDay(addDays(now, daysAhead))

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
    const dateKey = formatDateInput(session.sessionDate)
    const rows = existingByDate.get(dateKey) || []
    rows.push(session)
    existingByDate.set(dateKey, rows)
  }

  const desiredDateMap = new Map<
    string,
    ReturnType<typeof buildGeneratedSessionData>
  >()

  if (hasConfiguredClassSchedule(classData)) {
    const effectiveStart = new Date(
      Math.max(startOfDay(classData.startDate).getTime(), syncWindowStart.getTime())
    )
    const effectiveEnd = new Date(
      Math.min(endOfDay(classData.endDate).getTime(), syncWindowEnd.getTime())
    )
    const scheduleDaySet = new Set(sortClassScheduleDays(classData.scheduleDays))

    for (
      let cursor = new Date(effectiveStart);
      cursor.getTime() <= effectiveEnd.getTime();
      cursor = addDays(cursor, 1)
    ) {
      const weekday = getWeekdayValue(cursor)

      if (!scheduleDaySet.has(weekday)) {
        continue
      }

      const dateKey = formatDateInput(cursor)
      desiredDateMap.set(dateKey, buildGeneratedSessionData(classData, cursor, now))
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

    if (
      generatedSession._count.attendances > 0 ||
      generatedSession._count.teacherJoins > 0
    ) {
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

    const dateKey = formatDateInput(session.sessionDate)
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

  for (const classId of uniqueClassIds) {
    await syncRecurringSessionsForClass(classId, options)
  }
}
