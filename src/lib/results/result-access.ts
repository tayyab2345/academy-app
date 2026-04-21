import { Prisma, Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export interface ResultAccessUser {
  id: string
  role: Role
  academyId: string
}

export async function getTeacherProfileIdForUser(userId: string) {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  return teacherProfile?.id || null
}

export async function getStudentProfileIdForUser(userId: string) {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  return studentProfile?.id || null
}

export async function getParentStudentIdsForUser(userId: string) {
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!parentProfile) {
    return []
  }

  const links = await prisma.parentStudentLink.findMany({
    where: {
      parentProfileId: parentProfile.id,
    },
    select: {
      studentProfileId: true,
    },
  })

  return links.map((link) => link.studentProfileId)
}

export async function getManageableExamWhereForUser(
  user: ResultAccessUser,
  examId?: string
): Promise<Prisma.ExamWhereInput | null> {
  let where: Prisma.ExamWhereInput | null = null

  if (user.role === Role.admin) {
    where = {
      academyId: user.academyId,
    }
  } else if (user.role === Role.teacher) {
    const teacherProfileId = await getTeacherProfileIdForUser(user.id)

    if (teacherProfileId) {
      where = {
        academyId: user.academyId,
        class: {
          teachers: {
            some: {
              teacherProfileId,
            },
          },
        },
      }
    }
  }

  if (!where) {
    return null
  }

  if (!examId) {
    return where
  }

  return {
    AND: [where, { id: examId }],
  }
}

export async function getManageableClassWhereForUser(
  user: ResultAccessUser,
  classId?: string
): Promise<Prisma.ClassWhereInput | null> {
  let where: Prisma.ClassWhereInput | null = null

  if (user.role === Role.admin) {
    where = {
      academyId: user.academyId,
    }
  } else if (user.role === Role.teacher) {
    const teacherProfileId = await getTeacherProfileIdForUser(user.id)

    if (teacherProfileId) {
      where = {
        academyId: user.academyId,
        teachers: {
          some: {
            teacherProfileId,
          },
        },
      }
    }
  }

  if (!where) {
    return null
  }

  if (!classId) {
    return where
  }

  return {
    AND: [where, { id: classId }],
  }
}

export async function getVisibleExamWhereForUser(
  user: ResultAccessUser,
  examId?: string
): Promise<Prisma.ExamWhereInput | null> {
  let where: Prisma.ExamWhereInput | null = null

  if (user.role === Role.admin) {
    where = {
      academyId: user.academyId,
    }
  } else if (user.role === Role.teacher) {
    const teacherProfileId = await getTeacherProfileIdForUser(user.id)

    if (teacherProfileId) {
      where = {
        academyId: user.academyId,
        class: {
          teachers: {
            some: {
              teacherProfileId,
            },
          },
        },
      }
    }
  } else if (user.role === Role.student) {
    const studentProfileId = await getStudentProfileIdForUser(user.id)

    if (studentProfileId) {
      where = {
        academyId: user.academyId,
        results: {
          some: {
            studentProfileId,
          },
        },
      }
    }
  } else if (user.role === Role.parent) {
    const studentIds = await getParentStudentIdsForUser(user.id)

    if (studentIds.length > 0) {
      where = {
        academyId: user.academyId,
        results: {
          some: {
            studentProfileId: {
              in: studentIds,
            },
          },
        },
      }
    }
  }

  if (!where) {
    return null
  }

  if (!examId) {
    return where
  }

  return {
    AND: [where, { id: examId }],
  }
}

export async function getVisibleResultFileWhereForUser(
  user: ResultAccessUser
): Promise<Prisma.ResultFileWhereInput | null> {
  if (user.role === Role.admin) {
    return {
      exam: {
        academyId: user.academyId,
      },
    }
  }

  if (user.role === Role.teacher) {
    const teacherProfileId = await getTeacherProfileIdForUser(user.id)

    if (!teacherProfileId) {
      return null
    }

    return {
      exam: {
        academyId: user.academyId,
        class: {
          teachers: {
            some: {
              teacherProfileId,
            },
          },
        },
      },
    }
  }

  if (user.role === Role.student) {
    const studentProfileId = await getStudentProfileIdForUser(user.id)

    if (!studentProfileId) {
      return null
    }

    return {
      exam: {
        academyId: user.academyId,
        results: {
          some: {
            studentProfileId,
          },
        },
      },
      OR: [
        { studentProfileId: null },
        { studentProfileId },
      ],
    }
  }

  if (user.role === Role.parent) {
    const studentIds = await getParentStudentIdsForUser(user.id)

    if (studentIds.length === 0) {
      return null
    }

    return {
      exam: {
        academyId: user.academyId,
        results: {
          some: {
            studentProfileId: {
              in: studentIds,
            },
          },
        },
      },
      OR: [
        { studentProfileId: null },
        {
          studentProfileId: {
            in: studentIds,
          },
        },
      ],
    }
  }

  return null
}
