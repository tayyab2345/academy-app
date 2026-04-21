import { ExamType, Prisma, Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  getManageableExamWhereForUser,
  getParentStudentIdsForUser,
  getStudentProfileIdForUser,
  getTeacherProfileIdForUser,
} from "@/lib/results/result-access"

export type ResultClassOption = {
  id: string
  name: string
  section: string | null
  course: {
    id: string
    code: string
    name: string
  }
}

export type ParentResultChildOption = {
  id: string
  user: {
    firstName: string
    lastName: string
  }
}

export type ManageExamListItem = {
  id: string
  name: string
  type: ExamType
  examDate: string
  totalMarks: number
  class: {
    id: string
    name: string
    section: string | null
    course: {
      code: string
      name: string
    }
  }
  course: {
    code: string
    name: string
  } | null
  _count: {
    results: number
    resultFiles: number
  }
  summary: {
    enteredCount: number
    averagePercentage: number | null
    topPercentage: number | null
  }
}

export type ManageExamListPageData = {
  exams: ManageExamListItem[]
  total: number
  page: number
  totalPages: number
  availableClasses: ResultClassOption[]
}

export type ExamDetailStudentRow = {
  studentProfile: {
    id: string
    studentId: string
    user: {
      firstName: string
      lastName: string
      avatarUrl: string | null
    }
  }
  result: {
    id: string
    obtainedMarks: number
    totalMarks: number
    percentage: number
    grade: string | null
    remarks: string | null
  } | null
}

export type ExamDetailFileItem = {
  id: string
  fileUrl: string
  fileType: string
  mimeType: string
  createdAt: string
  uploadedBy: {
    firstName: string
    lastName: string
  }
  studentProfile: {
    id: string
    studentId: string
    user: {
      firstName: string
      lastName: string
    }
  } | null
}

export type ExamDetailPageData = {
  exam: {
    id: string
    name: string
    type: ExamType
    examDate: string
    totalMarks: number
    notes: string | null
    class: {
      id: string
      name: string
      section: string | null
      course: {
        id: string
        code: string
        name: string
      }
      teachers: Array<{
        role: string
        teacherProfile: {
          id: string
          user: {
            firstName: string
            lastName: string
          }
        }
      }>
    }
    course: {
      id: string
      code: string
      name: string
    } | null
    createdBy: {
      firstName: string
      lastName: string
    }
    createdAt: string
  }
  students: ExamDetailStudentRow[]
  resultFiles: ExamDetailFileItem[]
  summary: {
    studentCount: number
    enteredCount: number
    averagePercentage: number | null
    topPercentage: number | null
  }
}

export type PortalResultListItem = {
  examId: string
  examName: string
  examType: ExamType
  examDate: string
  totalMarks: number
  obtainedMarks: number
  percentage: number
  grade: string | null
  remarks: string | null
  class: {
    id: string
    name: string
    section: string | null
    course: {
      code: string
      name: string
    }
  }
  files: ExamDetailFileItem[]
  studentProfile?: {
    id: string
    studentId: string
    user: {
      firstName: string
      lastName: string
    }
  }
}

export type StudentResultsPageData = {
  results: PortalResultListItem[]
  total: number
  page: number
  totalPages: number
  availableClasses: ResultClassOption[]
}

export type ParentResultsPageData = {
  results: PortalResultListItem[]
  total: number
  page: number
  totalPages: number
  children: ParentResultChildOption[]
  availableClasses: ResultClassOption[]
}

function isExamType(value: string): value is ExamType {
  return Object.values(ExamType).includes(value as ExamType)
}

function calculateExamSummary(results: Array<{ percentage: Prisma.Decimal | number }>) {
  if (results.length === 0) {
    return {
      enteredCount: 0,
      averagePercentage: null,
      topPercentage: null,
    }
  }

  const percentages = results.map((result) => Number(result.percentage))
  const total = percentages.reduce((sum, value) => sum + value, 0)

  return {
    enteredCount: results.length,
    averagePercentage: Math.round((total / results.length) * 100) / 100,
    topPercentage: Math.max(...percentages),
  }
}

function mapClassOption(item: {
  id: string
  name: string
  section: string | null
  course: {
    id: string
    code: string
    name: string
  }
}) {
  return {
    id: item.id,
    name: item.name,
    section: item.section,
    course: item.course,
  }
}

export async function getManageableResultClassOptions(input: {
  academyId: string
  role: Role
  userId: string
}) {
  if (input.role === Role.admin) {
    const classes = await prisma.class.findMany({
      where: {
        academyId: input.academyId,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        section: true,
        course: {
          select: {
            id: true,
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

    return classes.map(mapClassOption)
  }

  if (input.role !== Role.teacher) {
    return []
  }

  const teacherProfileId = await getTeacherProfileIdForUser(input.userId)

  if (!teacherProfileId) {
    return []
  }

  const classAssignments = await prisma.classTeacher.findMany({
    where: {
      teacherProfileId,
      class: {
        academyId: input.academyId,
      },
    },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          course: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        class: {
          course: {
            code: "asc",
          },
        },
      },
      {
        class: {
          name: "asc",
        },
      },
    ],
  })

  return classAssignments.map((assignment) => mapClassOption(assignment.class))
}

export async function getManageableExamListPageData(input: {
  academyId: string
  userId: string
  role: Role
  page: number
  limit: number
  classId: string
  type: string
}): Promise<ManageExamListPageData | null> {
  const examWhere = await getManageableExamWhereForUser({
    id: input.userId,
    role: input.role,
    academyId: input.academyId,
  })

  if (!examWhere) {
    return null
  }

  const where: Prisma.ExamWhereInput = {
    ...examWhere,
  }

  if (input.classId) {
    where.classId = input.classId
  }

  if (isExamType(input.type)) {
    where.type = input.type
  }

  const [exams, total, availableClasses] = await Promise.all([
    prisma.exam.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        examDate: true,
        totalMarks: true,
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
        course: {
          select: {
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            results: true,
            resultFiles: true,
          },
        },
        results: {
          select: {
            percentage: true,
          },
        },
      },
      orderBy: {
        examDate: "desc",
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.exam.count({ where }),
    getManageableResultClassOptions({
      academyId: input.academyId,
      role: input.role,
      userId: input.userId,
    }),
  ])

  return {
    exams: exams.map((exam) => ({
      id: exam.id,
      name: exam.name,
      type: exam.type,
      examDate: exam.examDate.toISOString(),
      totalMarks: Number(exam.totalMarks),
      class: exam.class,
      course: exam.course,
      _count: exam._count,
      summary: calculateExamSummary(exam.results),
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
    availableClasses,
  }
}

export async function getExamDetailPageData(input: {
  academyId: string
  userId: string
  role: Role
  examId: string
}): Promise<ExamDetailPageData | null> {
  const where = await getManageableExamWhereForUser({
    id: input.userId,
    role: input.role,
    academyId: input.academyId,
  }, input.examId)

  if (!where) {
    return null
  }

  const exam = await prisma.exam.findFirst({
    where,
    select: {
      id: true,
      name: true,
      type: true,
      examDate: true,
      totalMarks: true,
      notes: true,
      createdAt: true,
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      course: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          course: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          teachers: {
            select: {
              role: true,
              teacherProfile: {
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
            orderBy: {
              createdAt: "asc",
            },
          },
          enrollments: {
            where: {
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
          },
        },
      },
      results: {
        select: {
          id: true,
          studentProfileId: true,
          obtainedMarks: true,
          totalMarks: true,
          percentage: true,
          grade: true,
          remarks: true,
        },
      },
      resultFiles: {
        select: {
          id: true,
          fileUrl: true,
          fileType: true,
          mimeType: true,
          createdAt: true,
          uploadedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
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
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  if (!exam) {
    return null
  }

  const resultMap = new Map(
    exam.results.map((result) => [result.studentProfileId, result])
  )

  const students = exam.class.enrollments.map((enrollment) => {
    const result = resultMap.get(enrollment.studentProfile.id)

    return {
      studentProfile: enrollment.studentProfile,
      result: result
        ? {
            id: result.id,
            obtainedMarks: Number(result.obtainedMarks),
            totalMarks: Number(result.totalMarks),
            percentage: Number(result.percentage),
            grade: result.grade,
            remarks: result.remarks,
          }
        : null,
    }
  })

  const summary = calculateExamSummary(exam.results)

  return {
    exam: {
      id: exam.id,
      name: exam.name,
      type: exam.type,
      examDate: exam.examDate.toISOString(),
      totalMarks: Number(exam.totalMarks),
      notes: exam.notes,
      class: exam.class,
      course: exam.course,
      createdBy: exam.createdBy,
      createdAt: exam.createdAt.toISOString(),
    },
    students,
    resultFiles: exam.resultFiles.map((file) => ({
      id: file.id,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      mimeType: file.mimeType,
      createdAt: file.createdAt.toISOString(),
      uploadedBy: file.uploadedBy,
      studentProfile: file.studentProfile,
    })),
    summary: {
      studentCount: students.length,
      enteredCount: summary.enteredCount,
      averagePercentage: summary.averagePercentage,
      topPercentage: summary.topPercentage,
    },
  }
}

export async function getStudentResultsPageData(input: {
  userId: string
  academyId: string
  page: number
  limit: number
  classId: string
  type: string
}): Promise<StudentResultsPageData | null> {
  const studentProfileId = await getStudentProfileIdForUser(input.userId)

  if (!studentProfileId) {
    return null
  }

  const examWhere: Prisma.ExamWhereInput = {
    academyId: input.academyId,
  }

  if (input.classId) {
    examWhere.classId = input.classId
  }

  if (isExamType(input.type)) {
    examWhere.type = input.type
  }

  const where: Prisma.ExamResultWhereInput = {
    studentProfileId,
    exam: examWhere,
  }

  const [results, total, enrollments] = await Promise.all([
    prisma.examResult.findMany({
      where,
      select: {
        examId: true,
        obtainedMarks: true,
        totalMarks: true,
        percentage: true,
        grade: true,
        remarks: true,
        exam: {
          select: {
            name: true,
            type: true,
            examDate: true,
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
            resultFiles: {
              where: {
                OR: [
                  {
                    studentProfileId: null,
                  },
                  {
                    studentProfileId,
                  },
                ],
              },
              select: {
                id: true,
                fileUrl: true,
                fileType: true,
                mimeType: true,
                createdAt: true,
                uploadedBy: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
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
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
      orderBy: {
        exam: {
          examDate: "desc",
        },
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.examResult.count({ where }),
    prisma.enrollment.findMany({
      where: {
        studentProfileId,
        status: "active",
      },
      select: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
            course: {
              select: {
                id: true,
                code: true,
                name: true,
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
  ).map(mapClassOption)

  return {
    results: results.map((result) => ({
      examId: result.examId,
      examName: result.exam.name,
      examType: result.exam.type,
      examDate: result.exam.examDate.toISOString(),
      totalMarks: Number(result.totalMarks),
      obtainedMarks: Number(result.obtainedMarks),
      percentage: Number(result.percentage),
      grade: result.grade,
      remarks: result.remarks,
      class: result.exam.class,
      files: result.exam.resultFiles.map((file) => ({
        id: file.id,
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        mimeType: file.mimeType,
        createdAt: file.createdAt.toISOString(),
        uploadedBy: file.uploadedBy,
        studentProfile: file.studentProfile,
      })),
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
    availableClasses,
  }
}

export async function getParentResultsPageData(input: {
  userId: string
  academyId: string
  page: number
  limit: number
  studentId: string
  classId: string
  type: string
}): Promise<ParentResultsPageData | null> {
  const childIds = await getParentStudentIdsForUser(input.userId)

  if (childIds.length === 0) {
    return {
      results: [],
      total: 0,
      page: input.page,
      totalPages: 0,
      children: [],
      availableClasses: [],
    }
  }

  const [childProfiles, activeEnrollments] = await Promise.all([
    prisma.studentProfile.findMany({
      where: {
        id: {
          in: childIds,
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
    prisma.enrollment.findMany({
      where: {
        studentProfileId: {
          in: childIds,
        },
        status: "active",
      },
      select: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
            course: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ])

  if (input.studentId && !childIds.includes(input.studentId)) {
    return {
      results: [],
      total: 0,
      page: input.page,
      totalPages: 0,
      children: childProfiles,
      availableClasses: Array.from(
        new Map(
          activeEnrollments.map((enrollment) => [enrollment.class.id, enrollment.class])
        ).values()
      ).map(mapClassOption),
    }
  }

  const scopedStudentIds = input.studentId ? [input.studentId] : childIds

  const examWhere: Prisma.ExamWhereInput = {
    academyId: input.academyId,
  }

  if (input.classId) {
    examWhere.classId = input.classId
  }

  if (isExamType(input.type)) {
    examWhere.type = input.type
  }

  const where: Prisma.ExamResultWhereInput = {
    studentProfileId: {
      in: scopedStudentIds,
    },
    exam: examWhere,
  }

  const [results, total] = await Promise.all([
    prisma.examResult.findMany({
      where,
      select: {
        examId: true,
        obtainedMarks: true,
        totalMarks: true,
        percentage: true,
        grade: true,
        remarks: true,
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
        exam: {
          select: {
            name: true,
            type: true,
            examDate: true,
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
            resultFiles: {
              where: {
                OR: [
                  {
                    studentProfileId: null,
                  },
                  {
                    studentProfileId: {
                      in: scopedStudentIds,
                    },
                  },
                ],
              },
              select: {
                id: true,
                fileUrl: true,
                fileType: true,
                mimeType: true,
                createdAt: true,
                uploadedBy: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
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
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
      orderBy: {
        exam: {
          examDate: "desc",
        },
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.examResult.count({ where }),
  ])

  const availableClasses = Array.from(
    new Map(
      activeEnrollments.map((enrollment) => [enrollment.class.id, enrollment.class])
    ).values()
  ).map(mapClassOption)

  return {
    results: results.map((result) => ({
      examId: result.examId,
      examName: result.exam.name,
      examType: result.exam.type,
      examDate: result.exam.examDate.toISOString(),
      totalMarks: Number(result.totalMarks),
      obtainedMarks: Number(result.obtainedMarks),
      percentage: Number(result.percentage),
      grade: result.grade,
      remarks: result.remarks,
      class: result.exam.class,
      files: result.exam.resultFiles.map((file) => ({
        id: file.id,
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        mimeType: file.mimeType,
        createdAt: file.createdAt.toISOString(),
        uploadedBy: file.uploadedBy,
        studentProfile: file.studentProfile,
      })),
      studentProfile: result.studentProfile,
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
    children: childProfiles,
    availableClasses,
  }
}
