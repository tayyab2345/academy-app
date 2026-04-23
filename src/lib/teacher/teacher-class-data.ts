import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

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
  course: {
    code: string
    name: string
    subjectArea: string
  }
  studentCount: number
  sessionCount: number
  nextSessionStartTime: string | null
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
    course: {
      code: string
      name: string
      syllabusPdfUrl: string | null
      syllabusImageUrl: string | null
    }
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
              status: { in: ["scheduled", "ongoing"] },
            },
            orderBy: {
              startTime: "asc",
            },
            take: 1,
            select: {
              startTime: true,
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

  return classTeachers.map((classTeacher) => ({
    id: classTeacher.class.id,
    name: classTeacher.class.name,
    role: classTeacher.role,
    section: classTeacher.class.section,
    scheduleDays: classTeacher.class.scheduleDays,
    scheduleStartTime: classTeacher.class.scheduleStartTime,
    scheduleEndTime: classTeacher.class.scheduleEndTime,
    scheduleRecurrence: classTeacher.class.scheduleRecurrence,
    course: classTeacher.class.course,
    studentCount: classTeacher.class._count.enrollments,
    sessionCount: classTeacher.class._count.sessions,
    nextSessionStartTime:
      classTeacher.class.sessions[0]?.startTime.toISOString() || null,
  }))
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
    classInfo: classTeacher.class,
    sessions: sessions.map((session) => ({
      ...session,
      meetingPlatform: session.meetingPlatform,
      status: session.status,
      sessionDate: session.sessionDate.toISOString(),
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
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
