import { syncRecurringSessionsForClass } from "@/lib/class-session-schedule"
import { prisma } from "@/lib/prisma"
import { buildDateTimeFromDateInputAndTime } from "@/lib/class-schedule"

export type TeacherAttendanceStatus = "present" | "absent" | "late" | "excused"

export type TeacherAttendanceClassOption = {
  id: string
  name: string
  section: string | null
  status: string
  course: {
    code: string
    name: string
  }
}

export type TeacherAttendanceClassInfo = {
  id: string
  name: string
  section: string | null
  status: string
  scheduleStartTime?: string | null
  scheduleEndTime?: string | null
  course: {
    code: string
    name: string
  }
}

export type TeacherAttendanceSessionInfo = {
  id: string
  title: string | null
  status: string
  sessionDate: string
  startTime: string
  endTime: string
}

export type TeacherAttendanceStudentItem = {
  studentProfile: {
    id: string
    studentId: string
    user: {
      firstName: string
      lastName: string
      avatarUrl: string | null
      email: string
    }
  }
  attendance: {
    id: string
    status: TeacherAttendanceStatus
    notes: string | null
    markedAt: string
    markedByTeacher: {
      user: {
        firstName: string
        lastName: string
      }
    } | null
  } | null
}

export type TeacherAttendancePageData = {
  classOptions: TeacherAttendanceClassOption[]
  selectedClassId: string
  selectedDate: string
  classInfo: TeacherAttendanceClassInfo | null
  attendanceSession: TeacherAttendanceSessionInfo | null
  students: TeacherAttendanceStudentItem[]
  summary: {
    total: number
    present: number
    absent: number
    late: number
    excused: number
    unmarked: number
  }
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function normalizeTeacherAttendanceDateInput(dateInput?: string | null) {
  const fallback = formatDateInput(new Date())

  if (!dateInput) {
    return fallback
  }

  const parsed = new Date(`${dateInput}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }

  return formatDateInput(parsed)
}

export function getTeacherAttendanceDayBounds(dateInput: string) {
  const start = new Date(`${dateInput}T00:00:00`)
  const end = new Date(`${dateInput}T23:59:59.999`)

  return { start, end }
}

function getManualSessionStatus(dateInput: string) {
  const now = new Date()
  const { start, end } = getTeacherAttendanceDayBounds(dateInput)

  if (end.getTime() < now.getTime()) {
    return "completed"
  }

  if (start.getTime() <= now.getTime() && end.getTime() >= now.getTime()) {
    return "ongoing"
  }

  return "scheduled"
}

function buildManualAttendanceSessionTitle(dateInput: string) {
  return `Attendance Record - ${new Date(`${dateInput}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  )}`
}

async function getTeacherAttendanceAccess(userId: string, classId: string) {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!teacherProfile) {
    return null
  }

  const classAssignment = await prisma.classTeacher.findUnique({
    where: {
      classId_teacherProfileId: {
        classId,
        teacherProfileId: teacherProfile.id,
      },
    },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          status: true,
          scheduleStartTime: true,
          scheduleEndTime: true,
          course: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!classAssignment) {
    return null
  }

  return {
    teacherProfileId: teacherProfile.id,
    classInfo: classAssignment.class,
  }
}

async function getTeacherAttendanceClassOptions(
  userId: string
): Promise<TeacherAttendanceClassOption[]> {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!teacherProfile) {
    return []
  }

  const classAssignments = await prisma.classTeacher.findMany({
    where: {
      teacherProfileId: teacherProfile.id,
    },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          status: true,
          course: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
    },
  })

  return classAssignments
    .map((assignment) => assignment.class)
    .sort((left, right) => {
      const courseComparison = left.course.code.localeCompare(right.course.code)

      if (courseComparison !== 0) {
        return courseComparison
      }

      return left.name.localeCompare(right.name)
    })
}

export type AttendanceDaySessionCandidate = {
  id: string
  title: string | null
  status: string
  sessionDate: Date
  startTime: Date
  endTime: Date
  _count: {
    attendances: number
  }
}

export function pickPreferredAttendanceSession(
  sessions: AttendanceDaySessionCandidate[]
): AttendanceDaySessionCandidate | null {
  if (sessions.length === 0) {
    return null
  }

  const nonCancelledSessions = sessions.filter(
    (session) => session.status !== "cancelled"
  )

  const sessionPool = nonCancelledSessions.length > 0 ? nonCancelledSessions : sessions
  const withAttendance = sessionPool
    .filter((session) => session._count.attendances > 0)
    .sort((left, right) => {
      const attendanceDiff =
        right._count.attendances - left._count.attendances

      if (attendanceDiff !== 0) {
        return attendanceDiff
      }

      return left.startTime.getTime() - right.startTime.getTime()
    })

  if (withAttendance.length > 0) {
    return withAttendance[0]
  }

  return sessionPool.sort(
    (left, right) => left.startTime.getTime() - right.startTime.getTime()
  )[0]
}

export async function getTeacherAttendancePageData(input: {
  userId: string
  classId?: string | null
  dateInput?: string | null
}): Promise<TeacherAttendancePageData | null> {
  const classOptions = await getTeacherAttendanceClassOptions(input.userId)
  const selectedDate = normalizeTeacherAttendanceDateInput(input.dateInput)
  const selectedClassId =
    classOptions.find((classItem) => classItem.id === input.classId)?.id ||
    classOptions[0]?.id ||
    ""

  if (classOptions.length === 0 || !selectedClassId) {
    return {
      classOptions,
      selectedClassId: "",
      selectedDate,
      classInfo: null,
      attendanceSession: null,
      students: [],
      summary: {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        unmarked: 0,
      },
    }
  }

  const access = await getTeacherAttendanceAccess(input.userId, selectedClassId)

  if (!access) {
    return null
  }

  await syncRecurringSessionsForClass(selectedClassId)

  const { start, end } = getTeacherAttendanceDayBounds(selectedDate)

  const [enrollments, daySessions] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        classId: selectedClassId,
        status: "active",
      },
      select: {
        studentProfile: {
          select: {
            id: true,
            studentId: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          studentProfile: {
            user: {
              firstName: "asc",
            },
          },
        },
        {
          studentProfile: {
            user: {
              lastName: "asc",
            },
          },
        },
      ],
    }),
    prisma.classSession.findMany({
      where: {
        classId: selectedClassId,
        sessionDate: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        sessionDate: true,
        startTime: true,
        endTime: true,
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    }),
  ])

  const attendanceSession = pickPreferredAttendanceSession(daySessions)

  const attendanceRecords = attendanceSession
    ? await prisma.attendance.findMany({
        where: {
          classSessionId: attendanceSession.id,
        },
        select: {
          id: true,
          studentProfileId: true,
          status: true,
          notes: true,
          markedAt: true,
          markedByTeacher: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      })
    : []

  const attendanceMap = new Map(
    attendanceRecords.map((record) => [record.studentProfileId, record])
  )

  const students = enrollments.map((enrollment) => {
    const attendance = attendanceMap.get(enrollment.studentProfile.id)

    return {
      studentProfile: enrollment.studentProfile,
      attendance: attendance
        ? {
            id: attendance.id,
            status: attendance.status,
            notes: attendance.notes,
            markedAt: attendance.markedAt.toISOString(),
            markedByTeacher: attendance.markedByTeacher,
          }
        : null,
    }
  })

  const summary = students.reduce(
    (accumulator, student) => {
      accumulator.total += 1

      if (!student.attendance) {
        accumulator.unmarked += 1
        return accumulator
      }

      accumulator[student.attendance.status] += 1
      return accumulator
    },
    {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      unmarked: 0,
    }
  )

  return {
    classOptions,
    selectedClassId,
    selectedDate,
    classInfo: access.classInfo,
    attendanceSession: attendanceSession
      ? {
          id: attendanceSession.id,
          title: attendanceSession.title,
          status: attendanceSession.status,
          sessionDate: attendanceSession.sessionDate.toISOString(),
          startTime: attendanceSession.startTime.toISOString(),
          endTime: attendanceSession.endTime.toISOString(),
        }
      : null,
    students,
    summary,
  }
}

export async function getTeacherAttendanceSaveContext(input: {
  userId: string
  classId: string
  dateInput: string
}) {
  const access = await getTeacherAttendanceAccess(input.userId, input.classId)

  if (!access) {
    return null
  }

  await syncRecurringSessionsForClass(input.classId)

  const { start, end } = getTeacherAttendanceDayBounds(input.dateInput)

  const [activeEnrollments, daySessions] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        classId: input.classId,
        status: "active",
      },
      select: {
        studentProfileId: true,
      },
    }),
    prisma.classSession.findMany({
      where: {
        classId: input.classId,
        sessionDate: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        sessionDate: true,
        startTime: true,
        endTime: true,
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    }),
  ])

  return {
    teacherProfileId: access.teacherProfileId,
    classInfo: access.classInfo,
    activeStudentProfileIds: activeEnrollments.map(
      (enrollment) => enrollment.studentProfileId
    ),
    attendanceSession: pickPreferredAttendanceSession(daySessions),
  }
}

export function buildTeacherManualAttendanceSession(input: {
  classId: string
  dateInput: string
  scheduleStartTime?: string | null
  scheduleEndTime?: string | null
}) {
  const sessionDate = new Date(`${input.dateInput}T00:00:00`)
  const startTime = buildDateTimeFromDateInputAndTime(
    input.dateInput,
    input.scheduleStartTime,
    9
  )
  const endTime = buildDateTimeFromDateInputAndTime(
    input.dateInput,
    input.scheduleEndTime,
    10
  )

  return {
    classId: input.classId,
    title: buildManualAttendanceSessionTitle(input.dateInput),
    sessionDate,
    startTime,
    endTime,
    meetingPlatform: "in_person" as const,
    generatedFromSchedule: true,
    status: getManualSessionStatus(input.dateInput) as
      | "scheduled"
      | "ongoing"
      | "completed",
  }
}
