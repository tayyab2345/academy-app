import { Prisma } from "@prisma/client"

interface SyncClassEnrollmentAssignmentsInput {
  tx: Prisma.TransactionClient
  academyId: string
  classId: string
  gradeLevel?: string | null
  studentProfileIds: string[]
}

export async function syncClassEnrollmentAssignments({
  tx,
  academyId,
  classId,
  gradeLevel,
  studentProfileIds,
}: SyncClassEnrollmentAssignmentsInput) {
  const uniqueStudentProfileIds = Array.from(
    new Set(studentProfileIds.filter(Boolean))
  )

  const selectedStudents =
    uniqueStudentProfileIds.length > 0
      ? await tx.studentProfile.findMany({
          where: {
            id: {
              in: uniqueStudentProfileIds,
            },
            ...(gradeLevel ? { gradeLevel } : {}),
            user: {
              academyId,
              role: "student",
              isActive: true,
            },
          },
          select: {
            id: true,
          },
        })
      : []

  if (selectedStudents.length !== uniqueStudentProfileIds.length) {
    throw new Error(
      "One or more selected students could not be assigned. Check academy ownership, grade level rules, and active status."
    )
  }

  const existingEnrollments = await tx.enrollment.findMany({
    where: {
      classId,
    },
    select: {
      id: true,
      studentProfileId: true,
      status: true,
    },
  })

  const targetIds = new Set(uniqueStudentProfileIds)
  const existingEnrollmentMap = new Map(
    existingEnrollments.map((enrollment) => [
      enrollment.studentProfileId,
      enrollment,
    ])
  )

  const studentIdsToDrop = existingEnrollments
    .filter(
      (enrollment) =>
        enrollment.status === "active" && !targetIds.has(enrollment.studentProfileId)
    )
    .map((enrollment) => enrollment.studentProfileId)

  if (studentIdsToDrop.length > 0) {
    await tx.enrollment.updateMany({
      where: {
        classId,
        studentProfileId: {
          in: studentIdsToDrop,
        },
        status: "active",
      },
      data: {
        status: "dropped",
      },
    })
  }

  for (const studentProfileId of uniqueStudentProfileIds) {
    const existingEnrollment = existingEnrollmentMap.get(studentProfileId)

    if (existingEnrollment) {
      if (existingEnrollment.status !== "active") {
        await tx.enrollment.update({
          where: {
            studentProfileId_classId: {
              studentProfileId,
              classId,
            },
          },
          data: {
            status: "active",
          },
        })
      }

      continue
    }

    await tx.enrollment.create({
      data: {
        classId,
        studentProfileId,
        status: "active",
      },
    })
  }
}
