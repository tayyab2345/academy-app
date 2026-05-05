import { unstable_cache } from "next/cache"
import { syncRecurringSessionsForClass, syncRecurringSessionsForClasses } from "@/lib/class-session-schedule"
import { prisma } from "@/lib/prisma"
import {
  getRelevantClassSession,
  getStartOfLocalDay,
} from "@/lib/relevant-session"

export type TeacherClassOption = {
  id: string
  name: string
  course: {
    code: string
    name: string
  }
}

export type TeacherClassOverviewItem = {
  id: string
  name: string
  role: string
  section: string | null
  scheduleDays: string[]
  scheduleStartTime: string | null
  scheduleEndTime: string | null
  scheduleRecurrence: string
  defaultMeetingPlatform: string
  defaultMeetingLink: string | null
  course: {
    code: string
    name: string
    subjectArea: string
  }
  studentCount: number
  sessionCount: number
  nextSession: TeacherClassSessionListItem | null
}

export type TeacherClassSessionListItem = {
  id: string
  title: string | null
  sessionDate: string
  startTime: string
  endTime: string
  meetingPlatform: string
  meetingLink: string | null
  status: string
  teacherJoin: {
    joinTime: string
    status: "on_time" | "late"
    lateMinutes: number
  } | null
  _count: {
    attendances: number
  }
}

export type TeacherClassSessionsPageData = {
  classInfo: {
    id: string
    name: string
    section: string | null
    scheduleDays: string[]
    scheduleStartTime: string | null
    scheduleEndTime: string | null
    scheduleRecurrence: string
    defaultMeetingPlatform: string
    defaultMeetingLink: string | null
    lateThresholdMinutes: number
    course: {
      code: string
      name: string
      syllabusPdfUrl: string | null
      syllabusImageUrl: string | null
    }
    nextSession: TeacherClassSessionListItem | null
  }
  sessions: TeacherClassSessionListItem[]
  total: number
  page: number
  totalPages: number
}

async function getTeacherActiveClassOptionsUncached(
  userId: string
): Promise<TeacherClassOption[]> {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!teacherProfile) {
    return []
  }

  const classTeachers = await prisma.classTeacher.findMany({
    where: {
      teacherProfileId: teacherProfile.id,
      class: {
        status: "active",
      },
    },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          scheduleDays: true,
          scheduleStartTime: true,
          scheduleEndTime: true,
          scheduleRecurrence: true,
          defaultMeetingPlatform: true,
          defaultMeetingLink: true,
          course: {
            select: {
              code: true,
              name: true,
              syllabusPdfUrl: true,
              syllabusImageUrl: true,
            },
          },
        },
      },
    },
  })

  return classTeachers
    .map((classTeacher) => classTeacher.class)
    .sort((left, right) => {
      const codeComparison = left.course.code.localeCompare(right.course.code)

      if (codeComparison !== 0) {
        return codeComparison
      }

      return left.name.localeCompare(right.name)
    })
}

export function getTeacherActiveClassOptions(userId: string) {
  return unstable_cache(
    async () => getTeacherActiveClassOptionsUncached(userId),
    ["teacher-active-class-options", userId],
    { revalidate: 60 }
  )()
}

export async function getTeacherClassesOverviewData(
  userId: string
): Promise<TeacherClassOverviewItem[] | null> {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!teacherProfile) {
    return null
  }

  const assignedClassIds = await prisma.classTeacher.findMany({
    where: {
      teacherProfileId: teacherProfile.id,
      class: {
        status: "active",
      },
    },
    select: {
      classId: true,
    },
  })

  await syncRecurringSessionsForClasses(
    assignedClassIds.map((assignment) => assignment.classId),
    {
      // Class overview only shows counts/next sessions, so avoid generating months of rows on list load.
      daysBack: 2,
      daysAhead: 14,
    }
  )

  const now = new Date()
  const todayStart = getStartOfLocalDay(now)

  const classTeachers = await prisma.classTeacher.findMany({
    where: {
      teacherProfileId: teacherProfile.id,
      class: {
        status: "active",
      },
    },
    select: {
      role: true,
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          scheduleDays: true,
          scheduleStartTime: true,
          scheduleEndTime: true,
          scheduleRecurrence: true,
          defaultMeetingPlatform: true,
          defaultMeetingLink: true,
          course: {
            select: {
              code: true,
              name: true,
              subjectArea: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              sessions: true,
            },
          },
          sessions: {
            where: {
              sessionDate: {
                gte: todayStart,
              },
              status: { in: ["scheduled", "ongoing", "completed"] },
            },
            orderBy: {
              startTime: "asc",
            },
            take: 7,
            select: {
              id: true,
              title: true,
              sessionDate: true,
              startTime: true,
              endTime: true,
              meetingPlatform: true,
              meetingLink: true,
              status: true,
              teacherJoins: {
                where: {
                  teacherProfileId: teacherProfile.id,
                },
                select: {
                  joinTime: true,
                  status: true,
                  lateMinutes: true,
                },
                take: 1,
              },
              _count: {
                select: {
                  attendances: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      class: {
        createdAt: "desc",
      },
    },
  })

  return classTeachers.map((classTeacher) => {
    const nextSession = getRelevantClassSession(classTeacher.class.sessions, now)

    return {
      id: classTeacher.class.id,
      name: classTeacher.class.name,
      role: classTeacher.role,
      section: classTeacher.class.section,
      scheduleDays: classTeacher.class.scheduleDays,
      scheduleStartTime: classTeacher.class.scheduleStartTime,
      scheduleEndTime: classTeacher.class.scheduleEndTime,
      scheduleRecurrence: classTeacher.class.scheduleRecurrence,
      defaultMeetingPlatform: classTeacher.class.defaultMeetingPlatform,
      defaultMeetingLink: classTeacher.class.defaultMeetingLink,
      course: classTeacher.class.course,
      studentCount: classTeacher.class._count.enrollments,
      sessionCount: classTeacher.class._count.sessions,
      nextSession: nextSession
        ? {
            id: nextSession.id,
            title: nextSession.title,
            sessionDate: nextSession.sessionDate.toISOString(),
            startTime: nextSession.startTime.toISOString(),
            endTime: nextSession.endTime.toISOString(),
            meetingPlatform: nextSession.meetingPlatform,
            meetingLink: nextSession.meetingLink,
            status: nextSession.status,
            _count: {
              attendances: nextSession._count.attendances,
            },
            teacherJoin: nextSession.teacherJoins[0]
              ? {
                  joinTime: nextSession.teacherJoins[0].joinTime.toISOString(),
                  status: nextSession.teacherJoins[0].status,
                  lateMinutes: nextSession.teacherJoins[0].lateMinutes,
                }
              : null,
          }
        : null,
    }
  })
}

export async function getTeacherClassSessionsPageData(input: {
  userId: string
  classId: string
  page: number
  limit: number
}): Promise<TeacherClassSessionsPageData | null> {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  })

  if (!teacherProfile) {
    return null
  }

  const classTeacher = await prisma.classTeacher.findUnique({
    where: {
      classId_teacherProfileId: {
        classId: input.classId,
        teacherProfileId: teacherProfile.id,
      },
    },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          scheduleDays: true,
          scheduleStartTime: true,
          scheduleEndTime: true,
          scheduleRecurrence: true,
          defaultMeetingPlatform: true,
          defaultMeetingLink: true,
          course: {
            select: {
              code: true,
              name: true,
              syllabusPdfUrl: true,
              syllabusImageUrl: true,
            },
          },
        },
      },
    },
  })

  if (!classTeacher) {
    return null
  }

  await syncRecurringSessionsForClass(input.classId, {
    daysBack: 2,
    daysAhead: 14,
  })

  const now = new Date()
  const todayStart = getStartOfLocalDay(now)

  const refreshedClassTeacher = await prisma.classTeacher.findUnique({
    where: {
      classId_teacherProfileId: {
        classId: input.classId,
        teacherProfileId: teacherProfile.id,
      },
    },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          scheduleDays: true,
          scheduleStartTime: true,
          scheduleEndTime: true,
          scheduleRecurrence: true,
          defaultMeetingPlatform: true,
          defaultMeetingLink: true,
          lateThresholdMinutes: true,
          course: {
            select: {
              code: true,
              name: true,
              syllabusPdfUrl: true,
              syllabusImageUrl: true,
            },
          },
          sessions: {
            where: {
              sessionDate: {
                gte: todayStart,
              },
              status: {
                in: ["scheduled", "ongoing", "completed"],
              },
            },
            orderBy: {
              startTime: "asc",
            },
            take: 7,
            select: {
              id: true,
              title: true,
              sessionDate: true,
              startTime: true,
              endTime: true,
              meetingPlatform: true,
              meetingLink: true,
              status: true,
              teacherJoins: {
                where: {
                  teacherProfileId: teacherProfile.id,
                },
                select: {
                  joinTime: true,
                  status: true,
                  lateMinutes: true,
                },
                take: 1,
              },
              _count: {
                select: {
                  attendances: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!refreshedClassTeacher) {
    return null
  }

  const relevantSession = getRelevantClassSession(
    refreshedClassTeacher.class.sessions,
    now
  )

  const where = {
    classId: input.classId,
  }

  const [sessions, total] = await Promise.all([
    prisma.classSession.findMany({
      where,
      select: {
        id: true,
        title: true,
        sessionDate: true,
        startTime: true,
        endTime: true,
        meetingPlatform: true,
        meetingLink: true,
        status: true,
        teacherJoins: {
          where: {
            teacherProfileId: teacherProfile.id,
          },
          select: {
            joinTime: true,
            status: true,
            lateMinutes: true,
          },
          take: 1,
        },
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
    }),
    prisma.classSession.count({ where }),
  ])

  return {
    classInfo: {
      ...refreshedClassTeacher.class,
      nextSession: relevantSession
        ? {
            id: relevantSession.id,
            title: relevantSession.title,
            meetingPlatform:
              relevantSession.meetingPlatform,
            meetingLink: relevantSession.meetingLink,
            status: relevantSession.status,
            sessionDate: relevantSession.sessionDate.toISOString(),
            startTime: relevantSession.startTime.toISOString(),
            endTime: relevantSession.endTime.toISOString(),
            _count: {
              attendances:
                relevantSession._count.attendances,
            },
            teacherJoin: relevantSession.teacherJoins[0]
              ? {
                  joinTime:
                    relevantSession.teacherJoins[0].joinTime.toISOString(),
                  status:
                    relevantSession.teacherJoins[0].status,
                  lateMinutes:
                    relevantSession.teacherJoins[0].lateMinutes,
                }
              : null,
          }
        : null,
    },
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      sessionDate: session.sessionDate.toISOString(),
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
      meetingPlatform: session.meetingPlatform,
      meetingLink: session.meetingLink,
      status: session.status,
      _count: {
        attendances: session._count.attendances,
      },
      teacherJoin: session.teacherJoins[0]
        ? {
            joinTime: session.teacherJoins[0].joinTime.toISOString(),
            status: session.teacherJoins[0].status,
            lateMinutes: session.teacherJoins[0].lateMinutes,
          }
        : null,
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  }
}
