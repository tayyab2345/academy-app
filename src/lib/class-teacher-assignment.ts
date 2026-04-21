import { Prisma } from "@prisma/client"

interface SyncPrimaryTeacherAssignmentInput {
  tx: Prisma.TransactionClient
  academyId: string
  classId: string
  teacherProfileId: string
}

export async function syncPrimaryTeacherAssignment({
  tx,
  academyId,
  classId,
  teacherProfileId,
}: SyncPrimaryTeacherAssignmentInput) {
  const teacher = await tx.teacherProfile.findUnique({
    where: { id: teacherProfileId },
    select: {
      id: true,
      user: {
        select: {
          academyId: true,
          role: true,
          isActive: true,
        },
      },
    },
  })

  if (
    !teacher ||
    teacher.user.academyId !== academyId ||
    teacher.user.role !== "teacher"
  ) {
    throw new Error("Teacher not found")
  }

  const existingAssignment = await tx.classTeacher.findUnique({
    where: {
      classId_teacherProfileId: {
        classId,
        teacherProfileId,
      },
    },
    select: {
      id: true,
      role: true,
      teacherProfileId: true,
    },
  })

  if (!teacher.user.isActive && !existingAssignment) {
    throw new Error("Only active teachers can be assigned to a class")
  }

  const currentPrimaryAssignment = await tx.classTeacher.findFirst({
    where: {
      classId,
      role: "primary",
    },
    select: {
      id: true,
      teacherProfileId: true,
    },
  })

  if (currentPrimaryAssignment?.teacherProfileId === teacherProfileId) {
    return
  }

  if (existingAssignment) {
    await tx.classTeacher.update({
      where: { id: existingAssignment.id },
      data: { role: "primary" },
    })
  } else {
    await tx.classTeacher.create({
      data: {
        classId,
        teacherProfileId,
        role: "primary",
      },
    })
  }

  if (
    currentPrimaryAssignment &&
    currentPrimaryAssignment.teacherProfileId !== teacherProfileId
  ) {
    await tx.classTeacher.update({
      where: { id: currentPrimaryAssignment.id },
      data: { role: "assistant" },
    })
  }
}
