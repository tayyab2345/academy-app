import { prisma } from "@/lib/prisma"
import {
  AttendanceDaySessionCandidate,
  getTeacherAttendanceDayBounds,
  normalizeTeacherAttendanceDateInput,
  pickPreferredAttendanceSession,
  type TeacherAttendanceStatus,
} from "@/lib/teacher/teacher-attendance-data"

export type AttendanceSummaryCounts = {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  unmarked: number
}

export type AttendanceRecordListItem = {
  id: string
  status: TeacherAttendanceStatus
  date: string
  markedAt: string
  joinTime?: string | null
  lateMinutes?: number | null
  sessionTitle: string | null
  class: {
    id: string
    name: string
    section: string | null
    course: {
      code: string
      name: string
    }
  }
  student?: {
    id: string
    studentId: string
    firstName: string
    lastName: string
  }
  markedBy?: {
    firstName: string
    lastName: string
  } | null
}

export type AttendanceHistoryListItem = {
  id: string
  title: string | null
  status: string
  sessionDate: string
  startTime: string
  endTime: string
  summary: AttendanceSummaryCounts
}

export type AttendanceStudentRow = {
  studentProfile: {
    id: string
    studentId: string
    user: {
      firstName: string
      lastName: string
      email: string
    }
  }
  attendance: {
    id: string
    status: TeacherAttendanceStatus
    notes: string | null
    markedAt: string
    joinTime: string | null
    lateMinutes: number | null
    markedByTeacher: {
      user: {
        firstName: string
        lastName: string
      }
    } | null
  } | null
}

export type AttendanceTeacherJoinRow = {
  id: string
  joinTime: string
  status: "on_time" | "late"
  lateMinutes: number
  teacher: {
    firstName: string
    lastName: string
    email: string
  }
}

export type AdminAttendancePageData = {
  classOptions: Array<{
    id: string
    name: string
    section: string | null
    status: string
    lateThresholdMinutes: number
    course: {
      code: string
      name: string
    }
  }>
  selectedClassId: string
  selectedDate: string
  classInfo: {
    id: string
    name: string
    section: string | null
    status: string
    lateThresholdMinutes: number
    course: {
      code: string
      name: string
    }
  } | null
  attendanceSession: {
    id: string
    title: string | null
    status: string
    sessionDate: string
    startTime: string
    endTime: string
  } | null
  students: AttendanceStudentRow[]
  teacherJoins: AttendanceTeacherJoinRow[]
  summary: AttendanceSummaryCounts
  history: AttendanceHistoryListItem[]
}

export type StudentAttendancePageData = {
  student: {
    id: string
    studentId: string
    firstName: string
    lastName: string
  }
  summary: AttendanceSummaryCounts
  attendanceRate: number | null
  classBreakdown: Array<{
    classId: string
    className: string
    section: string | null
    courseCode: string
    courseName: string
    summary: AttendanceSummaryCounts
  }>
  recentRecords: AttendanceRecordListItem[]
}

export type ParentAttendancePageData = {
  children: Array<{
    id: string
    studentId: string
    firstName: string
    lastName: string
  }>
  selectedChildId: string
  summary: AttendanceSummaryCounts
  attendanceRate: number | null
  childBreakdown: Array<{
    child: {
      id: string
      studentId: string
      firstName: string
      lastName: string
    }
    summary: AttendanceSummaryCounts
  }>
  recentRecords: AttendanceRecordListItem[]
}

function createEmptySummary(): AttendanceSummaryCounts {
  return {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    unmarked: 0,
  }
}

function addStatusToSummary(
  summary: AttendanceSummaryCounts,
  status: TeacherAttendanceStatus
) {
  summary.total += 1
  summary[status] += 1
  return summary
}

export function calculateAttendanceRate(summary: AttendanceSummaryCounts) {
  if (summary.total === 0) {
    return null
  }

  const attendedCount = summary.present + summary.late + summary.excused
  return Math.round((attendedCount / summary.total) * 100)
}

function buildAttendanceSummaryFromStatuses(
  records: Array<{ status: TeacherAttendanceStatus }>
) {
  return records.reduce((summary, record) => {
    return addStatusToSummary(summary, record.status)
  }, createEmptySummary())
}

function buildAttendanceSummaryFromStudents(students: AttendanceStudentRow[]) {
  return students.reduce((summary, student) => {
    if (!student.attendance) {
      summary.total += 1
      summary.unmarked += 1
      return summary
    }

    return addStatusToSummary(summary, student.attendance.status)
  }, createEmptySummary())
}

function mapHistorySessions(
  sessions: Array<{
    id: string
    title: string | null
    status: string
    sessionDate: Date
    startTime: Date
    endTime: Date
    attendances: Array<{
      status: TeacherAttendanceStatus
    }>
  }>
): AttendanceHistoryListItem[] {
  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    status: session.status,
    sessionDate: session.sessionDate.toISOString(),
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    summary: buildAttendanceSummaryFromStatuses(session.attendances),
  }))
}

async function getAdminAttendanceClassOptions(academyId: string) {
  const classes = await prisma.class.findMany({
    where: {
      academyId,
    },
    select: {
      id: true,
      name: true,
      section: true,
      status: true,
      lateThresholdMinutes: true,
      course: {
        select: {
          code: true,
          name: true,
        },
      },
    },
    orderBy: [
      {
        course: {
          code: "asc",
        },
      },
      {
        name: "asc",
      },
    ],
  })

  return classes
}

export async function getAdminAttendancePageData(input: {
  academyId: string
  classId?: string | null
  dateInput?: string | null
}): Promise<AdminAttendancePageData> {
  const classOptions = await getAdminAttendanceClassOptions(input.academyId)
  const selectedDate = normalizeTeacherAttendanceDateInput(input.dateInput)
  const selectedClassId =
    classOptions.find((classItem) => classItem.id === input.classId)?.id ||
    classOptions[0]?.id ||
    ""

  if (!selectedClassId) {
    return {
      classOptions,
      selectedClassId: "",
      selectedDate,
      classInfo: null,
      attendanceSession: null,
      students: [],
      teacherJoins: [],
      summary: createEmptySummary(),
      history: [],
    }
  }

  const classInfo = classOptions.find((classItem) => classItem.id === selectedClassId) || null
  const { start, end } = getTeacherAttendanceDayBounds(selectedDate)

  const [enrollments, daySessions, historySessions] = await Promise.all([
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
    prisma.classSession.findMany({
      where: {
        classId: selectedClassId,
        attendances: {
          some: {},
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        sessionDate: true,
        startTime: true,
        endTime: true,
        attendances: {
          select: {
            status: true,
          },
        },
      },
      orderBy: [
        {
          sessionDate: "desc",
        },
        {
          startTime: "desc",
        },
      ],
      take: 10,
    }),
  ])

  const attendanceSession = pickPreferredAttendanceSession(
    daySessions as AttendanceDaySessionCandidate[]
  )

  const [attendanceRecords, teacherJoins] = attendanceSession
    ? await Promise.all([
        prisma.attendance.findMany({
          where: {
            classSessionId: attendanceSession.id,
          },
          select: {
            id: true,
            studentProfileId: true,
            status: true,
            notes: true,
            joinTime: true,
            lateMinutes: true,
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
        }),
        prisma.teacherSessionJoin.findMany({
          where: {
            classSessionId: attendanceSession.id,
          },
          select: {
            id: true,
            joinTime: true,
            status: true,
            lateMinutes: true,
            teacherProfile: {
              select: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            joinTime: "asc",
          },
        }),
      ])
    : [[], []]

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
            joinTime: attendance.joinTime?.toISOString() || null,
            lateMinutes: attendance.lateMinutes,
            markedByTeacher: attendance.markedByTeacher,
          }
        : null,
    }
  })

  return {
    classOptions,
    selectedClassId,
    selectedDate,
    classInfo,
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
    teacherJoins: teacherJoins.map((teacherJoin) => ({
      id: teacherJoin.id,
      joinTime: teacherJoin.joinTime.toISOString(),
      status: teacherJoin.status,
      lateMinutes: teacherJoin.lateMinutes,
      teacher: teacherJoin.teacherProfile.user,
    })),
    summary: buildAttendanceSummaryFromStudents(students),
    history: mapHistorySessions(historySessions),
  }
}

export async function getStudentAttendancePageData(
  userId: string
): Promise<StudentAttendancePageData | null> {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      studentId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (!studentProfile) {
    return null
  }

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      studentProfileId: studentProfile.id,
    },
    select: {
      id: true,
      status: true,
      markedAt: true,
      classSession: {
        select: {
          title: true,
          sessionDate: true,
          class: {
            select: {
              id: true,
              name: true,
              section: true,
              course: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
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
    orderBy: [
      {
        classSession: {
          sessionDate: "desc",
        },
      },
      {
        markedAt: "desc",
      },
    ],
  })

  const summary = buildAttendanceSummaryFromStatuses(attendanceRecords)
  const classBreakdownMap = new Map<
    string,
    {
      classId: string
      className: string
      section: string | null
      courseCode: string
      courseName: string
      summary: AttendanceSummaryCounts
    }
  >()

  for (const record of attendanceRecords) {
    const classId = record.classSession.class.id
    const existing = classBreakdownMap.get(classId)

    if (!existing) {
      classBreakdownMap.set(classId, {
        classId,
        className: record.classSession.class.name,
        section: record.classSession.class.section,
        courseCode: record.classSession.class.course.code,
        courseName: record.classSession.class.course.name,
        summary: addStatusToSummary(createEmptySummary(), record.status),
      })
      continue
    }

    addStatusToSummary(existing.summary, record.status)
  }

  return {
    student: {
      id: studentProfile.id,
      studentId: studentProfile.studentId,
      firstName: studentProfile.user.firstName,
      lastName: studentProfile.user.lastName,
    },
    summary,
    attendanceRate: calculateAttendanceRate(summary),
    classBreakdown: Array.from(classBreakdownMap.values()).sort((left, right) =>
      `${left.courseCode}-${left.className}`.localeCompare(
        `${right.courseCode}-${right.className}`
      )
    ),
    recentRecords: attendanceRecords.slice(0, 20).map((record) => ({
      id: record.id,
      status: record.status,
      date: record.classSession.sessionDate.toISOString(),
      markedAt: record.markedAt.toISOString(),
      joinTime: null,
      lateMinutes: null,
      sessionTitle: record.classSession.title,
      class: {
        id: record.classSession.class.id,
        name: record.classSession.class.name,
        section: record.classSession.class.section,
        course: {
          code: record.classSession.class.course.code,
          name: record.classSession.class.course.name,
        },
      },
      markedBy: record.markedByTeacher?.user || null,
    })),
  }
}

export async function getParentAttendancePageData(input: {
  userId: string
  childId?: string | null
}): Promise<ParentAttendancePageData | null> {
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: input.userId },
    select: {
      id: true,
    },
  })

  if (!parentProfile) {
    return null
  }

  const linkedChildren = await prisma.parentStudentLink.findMany({
    where: {
      parentProfileId: parentProfile.id,
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
  })

  const children = linkedChildren.map((link) => ({
    id: link.studentProfile.id,
    studentId: link.studentProfile.studentId,
    firstName: link.studentProfile.user.firstName,
    lastName: link.studentProfile.user.lastName,
  }))

  const selectedChildId =
    children.find((child) => child.id === input.childId)?.id || ""
  const childIds =
    selectedChildId !== "" ? [selectedChildId] : children.map((child) => child.id)

  if (childIds.length === 0) {
    return {
      children,
      selectedChildId,
      summary: createEmptySummary(),
      attendanceRate: null,
      childBreakdown: [],
      recentRecords: [],
    }
  }

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      studentProfileId: {
        in: childIds,
      },
    },
    select: {
      id: true,
      status: true,
      markedAt: true,
      studentProfile: {
        select: {
          id: true,
          studentId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      classSession: {
        select: {
          title: true,
          sessionDate: true,
          class: {
            select: {
              id: true,
              name: true,
              section: true,
              course: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
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
    orderBy: [
      {
        classSession: {
          sessionDate: "desc",
        },
      },
      {
        markedAt: "desc",
      },
    ],
  })

  const summary = buildAttendanceSummaryFromStatuses(attendanceRecords)
  const childBreakdownMap = new Map<
    string,
    {
      child: {
        id: string
        studentId: string
        firstName: string
        lastName: string
      }
      summary: AttendanceSummaryCounts
    }
  >()

  for (const record of attendanceRecords) {
    const childId = record.studentProfile.id
    const existing = childBreakdownMap.get(childId)

    if (!existing) {
      childBreakdownMap.set(childId, {
        child: {
          id: record.studentProfile.id,
          studentId: record.studentProfile.studentId,
          firstName: record.studentProfile.user.firstName,
          lastName: record.studentProfile.user.lastName,
        },
        summary: addStatusToSummary(createEmptySummary(), record.status),
      })
      continue
    }

    addStatusToSummary(existing.summary, record.status)
  }

  return {
    children,
    selectedChildId,
    summary,
    attendanceRate: calculateAttendanceRate(summary),
    childBreakdown: Array.from(childBreakdownMap.values()).sort((left, right) =>
      `${left.child.firstName} ${left.child.lastName}`.localeCompare(
        `${right.child.firstName} ${right.child.lastName}`
      )
    ),
    recentRecords: attendanceRecords.slice(0, 20).map((record) => ({
      id: record.id,
      status: record.status,
      date: record.classSession.sessionDate.toISOString(),
      markedAt: record.markedAt.toISOString(),
      joinTime: null,
      lateMinutes: null,
      sessionTitle: record.classSession.title,
      class: {
        id: record.classSession.class.id,
        name: record.classSession.class.name,
        section: record.classSession.class.section,
        course: {
          code: record.classSession.class.course.code,
          name: record.classSession.class.course.name,
        },
      },
      student: {
        id: record.studentProfile.id,
        studentId: record.studentProfile.studentId,
        firstName: record.studentProfile.user.firstName,
        lastName: record.studentProfile.user.lastName,
      },
      markedBy: record.markedByTeacher?.user || null,
    })),
  }
}
