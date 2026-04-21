import { Prisma, ReportStatus, ReportType } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const reportTypes: ReportType[] = ["daily", "weekly", "monthly", "term"]
const reportStatuses: ReportStatus[] = ["draft", "published", "archived"]

export type ReportFilterClass = {
  id: string
  name: string
  course: {
    code: string
  }
}

export type ParentReportChild = {
  id: string
  user: {
    firstName: string
    lastName: string
  }
}

export type TeacherReportListItem = {
  id: string
  reportType: ReportType
  reportDate: string
  periodStart: string
  periodEnd: string
  status: ReportStatus
  studentProfile: {
    studentId: string
    user: {
      firstName: string
      lastName: string
    }
  }
  class: {
    name: string
    course: {
      code: string
      name: string
    }
  }
  _count: {
    sections: number
  }
}

export type PortalReportListItem = {
  id: string
  reportType: ReportType
  reportDate: string
  status: ReportStatus
  publishedAt: string | null
  studentProfile?: {
    studentId: string
    user: {
      firstName: string
      lastName: string
    }
  }
  class: {
    name: string
    course: {
      code: string
      name: string
    }
  }
  teacherProfile?: {
    user: {
      firstName: string
      lastName: string
    }
  }
  _count?: {
    sections: number
  }
}

export type TeacherReportsPageData = {
  reports: TeacherReportListItem[]
  total: number
  page: number
  totalPages: number
}

export type StudentReportsPageData = {
  reports: PortalReportListItem[]
  total: number
  page: number
  totalPages: number
  availableClasses: ReportFilterClass[]
}

export type ParentReportsPageData = {
  reports: PortalReportListItem[]
  total: number
  page: number
  totalPages: number
  children: ParentReportChild[]
  availableClasses: ReportFilterClass[]
}

function isReportType(value: string): value is ReportType {
  return reportTypes.includes(value as ReportType)
}

function isReportStatus(value: string): value is ReportStatus {
  return reportStatuses.includes(value as ReportStatus)
}

function toPortalReportListItem(
  report: {
    id: string
    reportType: ReportType
    reportDate: Date
    status: ReportStatus
    publishedAt: Date | null
    studentProfile?: {
      studentId: string
      user: {
        firstName: string
        lastName: string
      }
    }
    class: {
      name: string
      course: {
        code: string
        name: string
      }
    }
    teacherProfile?: {
      user: {
        firstName: string
        lastName: string
      }
    }
    _count?: {
      sections: number
    }
  }
): PortalReportListItem {
  return {
    ...report,
    reportDate: report.reportDate.toISOString(),
    publishedAt: report.publishedAt?.toISOString() || null,
  }
}

export async function getTeacherReportsPageData(input: {
  userId: string
  page: number
  limit: number
  status: string
  reportType: string
  classId?: string
  studentId?: string
}): Promise<TeacherReportsPageData | null> {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  })

  if (!teacherProfile) {
    return null
  }

  const where: Prisma.ReportWhereInput = {
    teacherProfileId: teacherProfile.id,
  }

  if (isReportStatus(input.status)) {
    where.status = input.status
  }

  if (isReportType(input.reportType)) {
    where.reportType = input.reportType
  }

  if (input.classId) {
    where.classId = input.classId
  }

  if (input.studentId) {
    where.studentProfileId = input.studentId
  }

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      select: {
        id: true,
        reportType: true,
        reportDate: true,
        periodStart: true,
        periodEnd: true,
        status: true,
        studentProfile: {
          select: {
            studentId: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        class: {
          select: {
            name: true,
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            sections: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.report.count({ where }),
  ])

  return {
    reports: reports.map((report) => ({
      ...report,
      reportDate: report.reportDate.toISOString(),
      periodStart: report.periodStart.toISOString(),
      periodEnd: report.periodEnd.toISOString(),
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  }
}

export async function getStudentReportsPageData(input: {
  userId: string
  page: number
  limit: number
  reportType: string
  classId: string
}): Promise<StudentReportsPageData | null> {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  })

  if (!studentProfile) {
    return null
  }

  const where: Prisma.ReportWhereInput = {
    studentProfileId: studentProfile.id,
    status: "published",
  }

  if (isReportType(input.reportType)) {
    where.reportType = input.reportType
  }

  if (input.classId) {
    where.classId = input.classId
  }

  const [reports, total, enrollments] = await Promise.all([
    prisma.report.findMany({
      where,
      select: {
        id: true,
        reportType: true,
        reportDate: true,
        status: true,
        publishedAt: true,
        class: {
          select: {
            name: true,
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        teacherProfile: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            sections: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.report.count({ where }),
    prisma.enrollment.findMany({
      where: {
        studentProfileId: studentProfile.id,
        status: "active",
      },
      select: {
        class: {
          select: {
            id: true,
            name: true,
            course: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    }),
  ])

  const availableClasses = Array.from(
    new Map(
      enrollments.map((enrollment) => [enrollment.class.id, enrollment.class])
    ).values()
  )

  return {
    reports: reports.map((report) => toPortalReportListItem(report)),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
    availableClasses,
  }
}

export async function getParentReportsPageData(input: {
  userId: string
  page: number
  limit: number
  reportType: string
  studentId: string
  classId: string
}): Promise<ParentReportsPageData | null> {
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  })

  if (!parentProfile) {
    return null
  }

  const childLinks = await prisma.parentStudentLink.findMany({
    where: {
      parentProfileId: parentProfile.id,
    },
    select: {
      studentProfileId: true,
      studentProfile: {
        select: {
          id: true,
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

  const studentIds = childLinks.map((link) => link.studentProfileId)
  const children = childLinks.map((link) => link.studentProfile)

  if (studentIds.length === 0) {
    return {
      reports: [],
      total: 0,
      page: input.page,
      totalPages: 0,
      children: [],
      availableClasses: [],
    }
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentProfileId: { in: studentIds },
      status: "active",
    },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          course: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  })

  const availableClasses = Array.from(
    new Map(
      enrollments.map((enrollment) => [enrollment.class.id, enrollment.class])
    ).values()
  )

  if (input.studentId && !studentIds.includes(input.studentId)) {
    return {
      reports: [],
      total: 0,
      page: input.page,
      totalPages: 0,
      children,
      availableClasses,
    }
  }

  const where: Prisma.ReportWhereInput = {
    studentProfileId: { in: studentIds },
    status: "published",
  }

  if (input.studentId) {
    where.studentProfileId = input.studentId
  }

  if (isReportType(input.reportType)) {
    where.reportType = input.reportType
  }

  if (input.classId) {
    where.classId = input.classId
  }

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      select: {
        id: true,
        reportType: true,
        reportDate: true,
        status: true,
        publishedAt: true,
        studentProfile: {
          select: {
            studentId: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        class: {
          select: {
            name: true,
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        teacherProfile: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            sections: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.report.count({ where }),
  ])

  return {
    reports: reports.map((report) => toPortalReportListItem(report)),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
    children,
    availableClasses,
  }
}
