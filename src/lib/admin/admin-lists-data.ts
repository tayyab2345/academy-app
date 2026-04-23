import { Prisma } from "@prisma/client"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

const classStatuses = ["active", "completed", "cancelled"] as const

export type AdminClassListItem = {
  id: string
  name: string
  section: string | null
  academicYear: string
  status: string
  startDate: string | null
  endDate: string | null
  course: {
    id: string
    code: string
    name: string
    subjectArea: string
  }
  _count: {
    enrollments: number
    teachers: number
  }
}

export type AdminClassesPageData = {
  classes: AdminClassListItem[]
  total: number
  page: number
  totalPages: number
}

export type AdminCourseListItem = {
  id: string
  code: string
  name: string
  gradeLevel: string
  subjectArea: string
  isActive: boolean
  createdAt: string
  _count: {
    classes: number
  }
}

export type AdminCoursesPageData = {
  courses: AdminCourseListItem[]
  total: number
  page: number
  totalPages: number
}

export type AdminParentListItem = {
  id: string
  occupation: string | null
  preferredContactMethod: string
  isPrimaryContact: boolean
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
    studentLinks: number
  }
}

export type AdminParentsPageData = {
  parents: AdminParentListItem[]
  total: number
  page: number
  totalPages: number
}

export type AdminClassOption = {
  id: string
  name: string
  course: {
    code: string
    name: string
  }
}

export type AdminCourseOption = {
  id: string
  code: string
  name: string
  gradeLevel: string
}

export type AdminTeacherAssignmentOption = {
  id: string
  employeeId: string | null
  user: {
    firstName: string
    lastName: string
    email: string
    avatarUrl?: string | null
    isActive: boolean
  }
}

export type AdminStudentAssignmentOption = {
  id: string
  studentId: string
  gradeLevel: string
  user: {
    firstName: string
    lastName: string
    email: string
    avatarUrl?: string | null
    isActive: boolean
  }
}

function isClassStatus(
  value: string
): value is (typeof classStatuses)[number] {
  return classStatuses.includes(value as (typeof classStatuses)[number])
}

export async function getAdminClassesPageData(input: {
  academyId: string
  page: number
  limit: number
  search: string
  status: string
}): Promise<AdminClassesPageData> {
  const where: Prisma.ClassWhereInput = {
    academyId: input.academyId,
  }

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { section: { contains: input.search, mode: "insensitive" } },
      { course: { code: { contains: input.search, mode: "insensitive" } } },
      { course: { name: { contains: input.search, mode: "insensitive" } } },
    ]
  }

  if (isClassStatus(input.status)) {
    where.status = input.status
  }

  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      select: {
        id: true,
        name: true,
        section: true,
        academicYear: true,
        status: true,
        startDate: true,
        endDate: true,
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            subjectArea: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: "active" },
            },
            teachers: true,
          },
        },
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.class.count({ where }),
  ])

  return {
    classes: classes.map((classItem) => ({
      ...classItem,
      startDate: classItem.startDate?.toISOString() || null,
      endDate: classItem.endDate?.toISOString() || null,
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  }
}

export async function getAdminCoursesPageData(input: {
  academyId: string
  page: number
  limit: number
  search: string
}): Promise<AdminCoursesPageData> {
  const where: Prisma.CourseWhereInput = {
    academyId: input.academyId,
  }

  if (input.search) {
    where.OR = [
      { code: { contains: input.search, mode: "insensitive" } },
      { name: { contains: input.search, mode: "insensitive" } },
      { gradeLevel: { contains: input.search, mode: "insensitive" } },
      { subjectArea: { contains: input.search, mode: "insensitive" } },
    ]
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        gradeLevel: true,
        subjectArea: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            classes: true,
          },
        },
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.count({ where }),
  ])

  return {
    courses: courses.map((course) => ({
      ...course,
      createdAt: course.createdAt.toISOString(),
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  }
}

export async function getAdminParentsPageData(input: {
  academyId: string
  page: number
  limit: number
  search: string
}): Promise<AdminParentsPageData> {
  const where: Prisma.ParentProfileWhereInput = {
    user: {
      academyId: input.academyId,
      role: "parent",
      isActive: true,
    },
  }

  if (input.search) {
    where.user = {
      academyId: input.academyId,
      role: "parent",
      isActive: true,
      OR: [
        { firstName: { contains: input.search, mode: "insensitive" } },
        { lastName: { contains: input.search, mode: "insensitive" } },
        { email: { contains: input.search, mode: "insensitive" } },
      ],
    }
  }

  const [parents, total] = await Promise.all([
    prisma.parentProfile.findMany({
      where,
      select: {
        id: true,
        occupation: true,
        preferredContactMethod: true,
        isPrimaryContact: true,
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
            studentLinks: true,
          },
        },
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.parentProfile.count({ where }),
  ])

  return {
    parents: parents.map((parent) => ({
      ...parent,
      user: {
        ...parent.user,
        createdAt: parent.user.createdAt.toISOString(),
      },
      preferredContactMethod: parent.preferredContactMethod,
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  }
}

async function getAdminActiveClassOptionsUncached(
  academyId: string
): Promise<AdminClassOption[]> {
  const classes = await prisma.class.findMany({
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
  })

  return classes.sort((left, right) => {
    const codeComparison = left.course.code.localeCompare(right.course.code)

    if (codeComparison !== 0) {
      return codeComparison
    }

    return left.name.localeCompare(right.name)
  })
}

async function getAdminCourseOptionsUncached(
  academyId: string,
  includeInactive: boolean
): Promise<AdminCourseOption[]> {
  return prisma.course.findMany({
    where: {
      academyId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: {
      id: true,
      code: true,
      name: true,
      gradeLevel: true,
    },
    orderBy: [
      { code: "asc" },
      { name: "asc" },
    ],
  })
}

export function getAdminActiveClassOptions(academyId: string) {
  return unstable_cache(
    async () => getAdminActiveClassOptionsUncached(academyId),
    ["admin-active-class-options", academyId],
    { revalidate: 60 }
  )()
}

export function getAdminCourseOptions(
  academyId: string,
  includeInactive: boolean
) {
  return unstable_cache(
    async () => getAdminCourseOptionsUncached(academyId, includeInactive),
    ["admin-course-options", academyId, includeInactive ? "all" : "active"],
    { revalidate: 60 }
  )()
}

export async function getAdminTeacherAssignmentOptions(
  academyId: string,
  includeTeacherProfileIds: string[] = []
): Promise<AdminTeacherAssignmentOption[]> {
  const uniqueIncludedTeacherIds = Array.from(
    new Set(includeTeacherProfileIds.filter(Boolean))
  )
  const activeTeacherUserScope: Prisma.UserWhereInput = {
    academyId,
    role: "teacher",
    isActive: true,
  }
  const includedTeacherUserScope: Prisma.UserWhereInput = {
    academyId,
    role: "teacher",
  }

  const teachers = await prisma.teacherProfile.findMany({
    where: {
      OR: [
        {
          user: activeTeacherUserScope,
        },
        ...(uniqueIncludedTeacherIds.length > 0
          ? [
              {
                id: {
                  in: uniqueIncludedTeacherIds,
                },
                user: includedTeacherUserScope,
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      employeeId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
    orderBy: [
      {
        user: {
          firstName: "asc",
        },
      },
      {
        user: {
          lastName: "asc",
        },
      },
    ],
  })

  return teachers.sort((left, right) => {
    if (left.user.isActive !== right.user.isActive) {
      return left.user.isActive ? -1 : 1
    }

    const firstNameComparison = left.user.firstName.localeCompare(
      right.user.firstName
    )

    if (firstNameComparison !== 0) {
      return firstNameComparison
    }

    return left.user.lastName.localeCompare(right.user.lastName)
  })
}

export async function getAdminStudentAssignmentOptions(
  academyId: string,
  includeStudentProfileIds: string[] = []
): Promise<AdminStudentAssignmentOption[]> {
  const uniqueIncludedStudentIds = Array.from(
    new Set(includeStudentProfileIds.filter(Boolean))
  )
  const activeStudentUserScope: Prisma.UserWhereInput = {
    academyId,
    role: "student",
    isActive: true,
  }
  const includedStudentUserScope: Prisma.UserWhereInput = {
    academyId,
    role: "student",
  }

  const students = await prisma.studentProfile.findMany({
    where: {
      OR: [
        {
          user: activeStudentUserScope,
        },
        ...(uniqueIncludedStudentIds.length > 0
          ? [
              {
                id: {
                  in: uniqueIncludedStudentIds,
                },
                user: includedStudentUserScope,
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      studentId: true,
      gradeLevel: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
    orderBy: [
      {
        user: {
          firstName: "asc",
        },
      },
      {
        user: {
          lastName: "asc",
        },
      },
    ],
  })

  return students.sort((left, right) => {
    if (left.user.isActive !== right.user.isActive) {
      return left.user.isActive ? -1 : 1
    }

    const gradeComparison = left.gradeLevel.localeCompare(right.gradeLevel)

    if (gradeComparison !== 0) {
      return gradeComparison
    }

    const firstNameComparison = left.user.firstName.localeCompare(
      right.user.firstName
    )

    if (firstNameComparison !== 0) {
      return firstNameComparison
    }

    return left.user.lastName.localeCompare(right.user.lastName)
  })
}
