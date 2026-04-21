import { unstable_cache } from "next/cache"
import { Prisma, ReportStatus, ReportType } from "@prisma/client"
import { formatCurrency } from "@/lib/currency-utils"
import { prisma } from "@/lib/prisma"

export const DEFAULT_PAGE_SIZE = 10

type DashboardSetupItem = {
  key: string
  title: string
  description: string
  completed: boolean
  href: string
  metric: string
}

type DashboardRecentActivityItem = {
  id: string
  type: "teacher" | "student" | "invoice" | "payment" | "report" | "post"
  title: string
  description: string
  href: string
  timestamp: Date
}

type RevenueSummary = {
  value: string
  description: string
  detail: string
}

export type AdminDashboardOverviewData = {
  academyName: string
  primaryColor: string
  stats: {
    studentCount: number
    teacherCount: number
    activeClassCount: number
    revenueMtd: RevenueSummary
  }
  setupItems: DashboardSetupItem[]
  completedSetupItems: number
  nextAction: DashboardSetupItem | null
  recentActivity: DashboardRecentActivityItem[]
}

export type AdminStudentListItem = {
  id: string
  studentId: string
  gradeLevel: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone: string | null
    avatarUrl: string | null
    isActive: boolean
    createdAt: string
  }
  _count: {
    parentLinks: number
  }
}

export type AdminStudentsPageData = {
  students: AdminStudentListItem[]
  total: number
  page: number
  totalPages: number
}

export type AdminTeacherListItem = {
  id: string
  employeeId: string | null
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone: string | null
    avatarUrl: string | null
    isActive: boolean
    createdAt: string
  }
}

export type AdminTeachersPageData = {
  teachers: AdminTeacherListItem[]
  total: number
  page: number
  totalPages: number
}

export type AdminInvoiceListItem = {
  id: string
  invoiceNumber: string
  description: string
  amount: number
  taxAmount: number
  totalAmount: number
  currency: string
  dueDate: string
  status: string
  paidAmount: number
  outstandingAmount: number
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
    }
  } | null
  _count: {
    payments: number
  }
}

export type AdminInvoicesPageData = {
  invoices: AdminInvoiceListItem[]
  total: number
  page: number
  totalPages: number
}

export type AdminReportFilterClass = {
  id: string
  name: string
  course: {
    code: string
    name: string
  }
}

export type AdminReportFilterTeacher = {
  id: string
  user: {
    firstName: string
    lastName: string
  }
}

export type AdminReportTableItem = {
  id: string
  reportType: ReportType
  reportDate: string
  status: ReportStatus
  publishedAt: string | null
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
  teacherProfile: {
    user: {
      firstName: string
      lastName: string
    }
  }
  _count: {
    sections: number
  }
}

export type AdminReportsPageData = {
  reports: AdminReportTableItem[]
  total: number
  page: number
  totalPages: number
  summary: {
    total: number
    draft: number
    published: number
    archived: number
  }
  availableClasses: AdminReportFilterClass[]
  availableTeachers: AdminReportFilterTeacher[]
}

const DEFAULT_PRIMARY_COLOR = "#059669"
const reportTypes: ReportType[] = ["daily", "weekly", "monthly", "term"]
const reportStatuses: ReportStatus[] = ["draft", "published", "archived"]

function isReportType(value: string): value is ReportType {
  return reportTypes.includes(value as ReportType)
}

function isReportStatus(value: string): value is ReportStatus {
  return reportStatuses.includes(value as ReportStatus)
}

export function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max: number = 100
) {
  const parsed = Number.parseInt(value || "", 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.min(parsed, max)
}

export function getSingleSearchParam(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function formatRevenueMtd(
  groupedPayments: Array<{
    currency: string
    _sum: {
      amount: unknown
    }
    _count: {
      _all: number
    }
  }>
) {
  if (groupedPayments.length === 0) {
    return {
      value: "$0.00",
      description: "No completed payments recorded this month",
      detail: "",
    }
  }

  const totals = groupedPayments
    .map((group) => ({
      currency: group.currency,
      amount: Number(group._sum.amount || 0),
      paymentCount: group._count._all,
    }))
    .sort((left, right) => right.amount - left.amount)

  if (totals.length === 1) {
    return {
      value: formatCurrency(totals[0].amount, totals[0].currency),
      description: `${totals[0].paymentCount} completed payment${totals[0].paymentCount === 1 ? "" : "s"} received this month`,
      detail: "",
    }
  }

  return {
    value: formatCurrency(totals[0].amount, totals[0].currency, {
      showCode: true,
    }),
    description: `Primary collection this month across ${totals.length} currencies`,
    detail: totals
      .slice(1)
      .map((entry) =>
        formatCurrency(entry.amount, entry.currency, {
          showCode: true,
        })
      )
      .join(" | "),
  }
}

function toTitleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

async function getAdminDashboardOverviewDataUncached(
  academyId: string
): Promise<AdminDashboardOverviewData> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [
    academy,
    teacherCount,
    studentCount,
    courseCount,
    activeClassCount,
    monthlyPayments,
    recentTeachers,
    recentStudents,
    recentInvoices,
    recentPayments,
    recentReports,
    recentPosts,
  ] = await Promise.all([
    prisma.academy.findUnique({
      where: { id: academyId },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        contactEmail: true,
        subdomain: true,
      },
    }),
    prisma.teacherProfile.count({
      where: {
        user: {
          academyId,
        },
      },
    }),
    prisma.studentProfile.count({
      where: {
        user: {
          academyId,
        },
      },
    }),
    prisma.course.count({
      where: {
        academyId,
      },
    }),
    prisma.class.count({
      where: {
        academyId,
        status: "active",
      },
    }),
    prisma.payment.groupBy({
      by: ["currency"],
      where: {
        status: "completed",
        paymentDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
        invoice: {
          studentProfile: {
            user: {
              academyId,
            },
          },
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.teacherProfile.findMany({
      where: {
        user: {
          academyId,
        },
      },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
    }),
    prisma.studentProfile.findMany({
      where: {
        user: {
          academyId,
        },
      },
      select: {
        id: true,
        createdAt: true,
        studentId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
    }),
    prisma.invoice.findMany({
      where: {
        status: {
          in: ["sent", "partial", "paid", "overdue", "waived"],
        },
        studentProfile: {
          user: {
            academyId,
          },
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        currency: true,
        totalAmount: true,
        issuedAt: true,
        studentProfile: {
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
      orderBy: {
        issuedAt: "desc",
      },
      take: 4,
    }),
    prisma.payment.findMany({
      where: {
        status: "completed",
        invoice: {
          studentProfile: {
            user: {
              academyId,
            },
          },
        },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        createdAt: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            studentProfile: {
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
    }),
    prisma.report.findMany({
      where: {
        status: "published",
        publishedAt: {
          not: null,
        },
        class: {
          academyId,
        },
      },
      select: {
        id: true,
        reportType: true,
        publishedAt: true,
        studentProfile: {
          select: {
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
              },
            },
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 4,
    }),
    prisma.post.findMany({
      where: {
        OR: [
          {
            class: {
              academyId,
            },
          },
          {
            classId: null,
            author: {
              academyId,
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            name: true,
            course: {
              select: {
                code: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
    }),
  ])

  const hasConfiguredAcademySettings = Boolean(
    academy &&
      academy.contactEmail &&
      academy.subdomain &&
      (academy.logoUrl ||
        academy.primaryColor !== DEFAULT_PRIMARY_COLOR ||
        academy.secondaryColor)
  )

  const setupItems: DashboardSetupItem[] = [
    {
      key: "academy-settings",
      title: "Academy settings configured",
      description: hasConfiguredAcademySettings
        ? "Branding and academy details have been configured."
        : "Add your logo or customize your academy branding.",
      completed: hasConfiguredAcademySettings,
      href: "/admin/settings",
      metric: hasConfiguredAcademySettings ? "Configured" : "Needs attention",
    },
    {
      key: "teachers",
      title: "At least 1 teacher added",
      description:
        teacherCount > 0
          ? `${teacherCount} teacher${teacherCount === 1 ? "" : "s"} added so far.`
          : "Create your first teacher account to start assigning classes.",
      completed: teacherCount > 0,
      href: "/admin/teachers",
      metric: `${teacherCount} total`,
    },
    {
      key: "students",
      title: "At least 1 student added",
      description:
        studentCount > 0
          ? `${studentCount} student${studentCount === 1 ? "" : "s"} enrolled so far.`
          : "Add a student to begin enrollment and billing.",
      completed: studentCount > 0,
      href: "/admin/students",
      metric: `${studentCount} total`,
    },
    {
      key: "courses",
      title: "At least 1 course created",
      description:
        courseCount > 0
          ? `${courseCount} course${courseCount === 1 ? "" : "s"} available in your catalog.`
          : "Create a course to define your academic offerings.",
      completed: courseCount > 0,
      href: "/admin/courses",
      metric: `${courseCount} total`,
    },
    {
      key: "classes",
      title: "At least 1 class created",
      description:
        activeClassCount > 0
          ? `${activeClassCount} active class${activeClassCount === 1 ? "" : "es"} running right now.`
          : "Create a class to connect teachers, students, and schedules.",
      completed: activeClassCount > 0,
      href: "/admin/classes",
      metric: `${activeClassCount} active`,
    },
  ]

  const recentActivity = [
    ...recentTeachers.map<DashboardRecentActivityItem>((teacher) => ({
      id: `teacher-${teacher.id}`,
      type: "teacher",
      title: `${teacher.user.firstName} ${teacher.user.lastName} joined your staff`,
      description: "Teacher profile created",
      href: `/admin/teachers/${teacher.id}`,
      timestamp: teacher.createdAt,
    })),
    ...recentStudents.map<DashboardRecentActivityItem>((student) => ({
      id: `student-${student.id}`,
      type: "student",
      title: `${student.user.firstName} ${student.user.lastName} was added`,
      description: `Student profile created (${student.studentId})`,
      href: `/admin/students/${student.id}`,
      timestamp: student.createdAt,
    })),
    ...recentInvoices.map<DashboardRecentActivityItem>((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: "invoice",
      title: `Invoice ${invoice.invoiceNumber} was sent`,
      description: `${invoice.studentProfile.user.firstName} ${invoice.studentProfile.user.lastName} | ${formatCurrency(Number(invoice.totalAmount), invoice.currency)}`,
      href: `/admin/finance/invoices/${invoice.id}`,
      timestamp: invoice.issuedAt,
    })),
    ...recentPayments.map<DashboardRecentActivityItem>((payment) => ({
      id: `payment-${payment.id}`,
      type: "payment",
      title: `Payment recorded for ${payment.invoice.invoiceNumber}`,
      description: `${payment.invoice.studentProfile.user.firstName} ${payment.invoice.studentProfile.user.lastName} | ${formatCurrency(Number(payment.amount), payment.currency)}`,
      href: `/admin/finance/invoices/${payment.invoice.id}`,
      timestamp: payment.createdAt,
    })),
    ...recentReports
      .filter((report) => report.publishedAt)
      .map<DashboardRecentActivityItem>((report) => ({
        id: `report-${report.id}`,
        type: "report",
        title: `${toTitleCase(report.reportType)} report published`,
        description: `${report.studentProfile.user.firstName} ${report.studentProfile.user.lastName} | ${report.class.course.code}: ${report.class.name}`,
        href: `/admin/reports/${report.id}`,
        timestamp: report.publishedAt as Date,
      })),
    ...recentPosts.map<DashboardRecentActivityItem>((post) => ({
      id: `post-${post.id}`,
      type: "post",
      title: post.title,
      description: post.class
        ? `${post.author.firstName} ${post.author.lastName} posted in ${post.class.course.code}: ${post.class.name}`
        : `${post.author.firstName} ${post.author.lastName} posted an academy-wide announcement`,
      href: `/admin/posts/${post.id}`,
      timestamp: post.createdAt,
    })),
  ]
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 8)

  const completedSetupItems = setupItems.filter((item) => item.completed).length

  return {
    academyName: academy?.name || "Your Academy",
    primaryColor: academy?.primaryColor || DEFAULT_PRIMARY_COLOR,
    stats: {
      studentCount,
      teacherCount,
      activeClassCount,
      revenueMtd: formatRevenueMtd(monthlyPayments),
    },
    setupItems,
    completedSetupItems,
    nextAction: setupItems.find((item) => !item.completed) || null,
    recentActivity,
  }
}

export async function getAdminDashboardOverviewData(academyId: string) {
  return unstable_cache(
    async () => getAdminDashboardOverviewDataUncached(academyId),
    ["admin-dashboard-overview", academyId],
    {
      revalidate: 60,
    }
  )()
}

export async function getAdminStudentsPageData(input: {
  academyId: string
  page: number
  limit: number
  search: string
  gradeLevel: string
}): Promise<AdminStudentsPageData> {
  const where: Prisma.StudentProfileWhereInput = {
    user: {
      academyId: input.academyId,
      role: "student",
      isActive: true,
    },
  }

  if (input.search) {
    where.OR = [
      { studentId: { contains: input.search, mode: "insensitive" } },
      { user: { firstName: { contains: input.search, mode: "insensitive" } } },
      { user: { lastName: { contains: input.search, mode: "insensitive" } } },
      { user: { email: { contains: input.search, mode: "insensitive" } } },
    ]
  }

  if (input.gradeLevel) {
    where.gradeLevel = input.gradeLevel
  }

  const [students, total] = await Promise.all([
    prisma.studentProfile.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        gradeLevel: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            parentLinks: true,
          },
        },
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.studentProfile.count({ where }),
  ])

  return {
    students: students.map((student) => ({
      ...student,
      user: {
        ...student.user,
        createdAt: student.user.createdAt.toISOString(),
      },
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  }
}

export async function getAdminTeachersPageData(input: {
  academyId: string
  page: number
  limit: number
  search: string
}): Promise<AdminTeachersPageData> {
  const where: Prisma.TeacherProfileWhereInput = {
    user: {
      academyId: input.academyId,
      role: "teacher",
      isActive: true,
    },
  }

  if (input.search) {
    where.OR = [
      { employeeId: { contains: input.search, mode: "insensitive" } },
      { user: { firstName: { contains: input.search, mode: "insensitive" } } },
      { user: { lastName: { contains: input.search, mode: "insensitive" } } },
      { user: { email: { contains: input.search, mode: "insensitive" } } },
    ]
  }

  const [teachers, total] = await Promise.all([
    prisma.teacherProfile.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.teacherProfile.count({ where }),
  ])

  return {
    teachers: teachers.map((teacher) => ({
      ...teacher,
      user: {
        ...teacher.user,
        createdAt: teacher.user.createdAt.toISOString(),
      },
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  }
}

export async function getAdminInvoicesPageData(input: {
  academyId: string
  page: number
  limit: number
  search: string
  status: string
  currency: string
  studentId?: string
  classId?: string
}): Promise<AdminInvoicesPageData> {
  const where: Prisma.InvoiceWhereInput = {
    studentProfile: {
      user: {
        academyId: input.academyId,
      },
    },
  }

  const andConditions: Prisma.InvoiceWhereInput[] = []

  if (input.search) {
    andConditions.push({
      OR: [
        { invoiceNumber: { contains: input.search, mode: "insensitive" } },
        { description: { contains: input.search, mode: "insensitive" } },
        {
          studentProfile: {
            user: {
              OR: [
                { firstName: { contains: input.search, mode: "insensitive" } },
                { lastName: { contains: input.search, mode: "insensitive" } },
              ],
            },
          },
        },
        {
          studentProfile: {
            studentId: { contains: input.search, mode: "insensitive" },
          },
        },
      ],
    })
  }

  if (input.status) {
    if (input.status === "overdue") {
      andConditions.push(
        {
          status: {
            in: ["sent", "partial", "overdue"],
          },
        },
        {
          dueDate: {
            lt: new Date(),
          },
        }
      )
    } else {
      andConditions.push({
        status: input.status as Prisma.InvoiceWhereInput["status"],
      })
    }
  }

  if (input.currency) {
    andConditions.push({ currency: input.currency })
  }

  if (input.studentId) {
    andConditions.push({ studentProfileId: input.studentId })
  }

  if (input.classId) {
    andConditions.push({ classId: input.classId })
  }

  if (andConditions.length > 0) {
    where.AND = andConditions
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        description: true,
        amount: true,
        taxAmount: true,
        totalAmount: true,
        currency: true,
        dueDate: true,
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
              },
            },
          },
        },
        payments: {
          where: {
            status: "completed",
          },
          select: {
            amount: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.count({ where }),
  ])

  return {
    invoices: invoices.map((invoice) => {
      const paidAmount = invoice.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      )

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        description: invoice.description,
        amount: Number(invoice.amount),
        taxAmount: Number(invoice.taxAmount),
        totalAmount: Number(invoice.totalAmount),
        currency: invoice.currency,
        dueDate: invoice.dueDate.toISOString(),
        status: invoice.status,
        paidAmount,
        outstandingAmount: Number(invoice.totalAmount) - paidAmount,
        studentProfile: invoice.studentProfile,
        class: invoice.class,
        _count: invoice._count,
      }
    }),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  }
}

async function getAdminReportFilterOptions(academyId: string) {
  return unstable_cache(
    async () => {
      const [availableClasses, availableTeachers] = await Promise.all([
        prisma.class.findMany({
          where: {
            academyId,
            status: "active",
          },
          select: {
            id: true,
            name: true,
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.teacherProfile.findMany({
          where: {
            user: {
              academyId,
            },
          },
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            user: {
              firstName: "asc",
            },
          },
        }),
      ])

      return {
        availableClasses,
        availableTeachers,
      }
    },
    ["admin-report-filter-options", academyId],
    {
      revalidate: 300,
    }
  )()
}

export async function getAdminReportsPageData(input: {
  academyId: string
  page: number
  limit: number
  search: string
  status: string
  reportType: string
  classId: string
  studentId: string
  teacherId: string
}): Promise<AdminReportsPageData> {
  const where: Prisma.ReportWhereInput = {
    class: {
      academyId: input.academyId,
    },
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

  if (input.teacherId) {
    where.teacherProfileId = input.teacherId
  }

  if (input.search) {
    where.OR = [
      {
        studentProfile: {
          user: {
            OR: [
              { firstName: { contains: input.search, mode: "insensitive" } },
              { lastName: { contains: input.search, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        teacherProfile: {
          user: {
            OR: [
              { firstName: { contains: input.search, mode: "insensitive" } },
              { lastName: { contains: input.search, mode: "insensitive" } },
            ],
          },
        },
      },
    ]
  }

  const academyScope: Prisma.ReportWhereInput = {
    class: {
      academyId: input.academyId,
    },
  }

  const [reports, total, summaryGroups, filterOptions] = await Promise.all([
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
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.count({ where }),
    prisma.report.groupBy({
      by: ["status"],
      where: academyScope,
      _count: {
        _all: true,
      },
    }),
    getAdminReportFilterOptions(input.academyId),
  ])

  const summary = {
    total: 0,
    draft: 0,
    published: 0,
    archived: 0,
  }

  for (const group of summaryGroups) {
    summary[group.status] = group._count._all
  }

  summary.total = summary.draft + summary.published + summary.archived

  return {
    reports: reports.map((report) => ({
      ...report,
      reportDate: report.reportDate.toISOString(),
      publishedAt: report.publishedAt ? report.publishedAt.toISOString() : null,
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
    summary,
    availableClasses: filterOptions.availableClasses,
    availableTeachers: filterOptions.availableTeachers,
  }
}
