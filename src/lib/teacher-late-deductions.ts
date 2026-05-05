import { NotificationType, Role } from "@prisma/client"
import { formatSessionDate } from "@/lib/attendance-utils"
import { createNotificationsForMany } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

export const TEACHER_DEDUCTION_LATE_MINUTES = 5

type TeacherLateDeductionInput = {
  classSessionId: string
  teacherProfileId: string
  joinTime: Date
  scheduledStartTime: Date
  lateMinutes: number
}

export async function upsertTeacherLateDeductionFlag(
  input: TeacherLateDeductionInput
) {
  const classSession = await prisma.classSession.findUnique({
    where: { id: input.classSessionId },
    select: {
      id: true,
      classId: true,
      startTime: true,
      class: {
        select: {
          id: true,
          academyId: true,
          name: true,
          course: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!classSession || input.lateMinutes <= 0) {
    return null
  }

  const deductionRequired =
    input.lateMinutes >= TEACHER_DEDUCTION_LATE_MINUTES
  const classLabel = `${classSession.class.course.code}: ${classSession.class.name}`
  const deductionReason = deductionRequired
    ? `Teacher joined ${classLabel} ${input.lateMinutes} minute${
        input.lateMinutes === 1 ? "" : "s"
      } late on ${formatSessionDate(classSession.startTime)}. Salary deduction has been marked.`
    : `Teacher joined ${classLabel} ${input.lateMinutes} minute${
        input.lateMinutes === 1 ? "" : "s"
      } late on ${formatSessionDate(classSession.startTime)}.`

  const deduction = await prisma.teacherLateDeduction.upsert({
    where: {
      classSessionId_teacherProfileId: {
        classSessionId: input.classSessionId,
        teacherProfileId: input.teacherProfileId,
      },
    },
    update: {
      joinTime: input.joinTime,
      scheduledStartTime: input.scheduledStartTime,
      lateMinutes: input.lateMinutes,
      deductionRequired,
      deductionReason,
    },
    create: {
      academyId: classSession.class.academyId,
      teacherProfileId: input.teacherProfileId,
      classSessionId: input.classSessionId,
      classId: classSession.classId,
      joinTime: input.joinTime,
      scheduledStartTime: input.scheduledStartTime,
      lateMinutes: input.lateMinutes,
      deductionRequired,
      deductionReason,
    },
  })

  if (!deductionRequired) {
    return deduction
  }

  const admins = await prisma.user.findMany({
    where: {
      academyId: classSession.class.academyId,
      role: Role.admin,
    },
    select: {
      id: true,
    },
  })

  await createNotificationsForMany(
    admins.map((admin) => admin.id),
    {
      academyId: classSession.class.academyId,
      type: NotificationType.salary_deduction_marked,
      title: "Salary Deduction Marked",
      message: deductionReason,
      actionUrl: `/admin/attendance?classId=${classSession.classId}&date=${classSession.startTime
        .toISOString()
        .slice(0, 10)}`,
      entityType: "teacher_late_deduction",
      entityId: deduction.id,
    }
  )

  return deduction
}
