import { NotificationType, PostVisibility, Prisma, Role } from "@prisma/client"
import { getInvoiceActionUrlForRole } from "@/lib/manual-payment-utils"
import { getPostActionUrlForRole } from "@/lib/post-access"
import {
  calculatePayrollBreakdownTotals,
  formatPayrollPeriod,
  toNumber,
} from "@/lib/payroll/payroll-utils"
import { prisma } from "@/lib/prisma"

interface CreateNotificationParams {
  academyId?: string | null
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string | null
  entityType?: string
  entityId?: string
}

type ClassParticipantContext = {
  id: string
  academyId: string
  name: string
  scheduleDays: string[]
  scheduleStartTime: string | null
  scheduleEndTime: string | null
  defaultMeetingPlatform: string
  defaultMeetingLink: string | null
  course: {
    code: string
    name: string
  }
  teachers: Array<{
    teacherProfile: {
      id: string
      user: {
        id: string
      }
    }
  }>
  enrollments: Array<{
    studentProfile: {
      id: string
      user: {
        id: string
        firstName: string
        lastName: string
      }
      parentLinks: Array<{
        parentProfile: {
          user: {
            id: string
          }
        }
      }>
    }
  }>
}

async function resolveNotificationAcademyId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { academyId: true },
  })

  return user?.academyId ?? null
}

function buildDuplicateWhere(
  userId: string,
  params: Omit<CreateNotificationParams, "userId">
): Prisma.NotificationWhereInput | null {
  if (!params.entityType || !params.entityId) {
    return null
  }

  return {
    userId,
    type: params.type,
    title: params.title,
    message: params.message,
    entityType: params.entityType,
    entityId: params.entityId,
  }
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const academyId =
      params.academyId === undefined
        ? await resolveNotificationAcademyId(params.userId)
        : params.academyId
    const duplicateWhere = buildDuplicateWhere(params.userId, params)

    if (duplicateWhere) {
      const existingNotification = await prisma.notification.findFirst({
        where: duplicateWhere,
      })

      if (existingNotification) {
        return existingNotification
      }
    }

    const notification = await prisma.notification.create({
      data: {
        academyId: academyId ?? undefined,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl ?? null,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    })

    return notification
  } catch (error) {
    console.error("Failed to create notification:", error)
    return null
  }
}

export async function createNotificationsForMany(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))]

  if (uniqueUserIds.length === 0) {
    return []
  }

  try {
    const userAcademies =
      params.academyId === undefined
        ? await prisma.user.findMany({
            where: { id: { in: uniqueUserIds } },
            select: {
              id: true,
              academyId: true,
            },
          })
        : []
    const academyIdByUserId = new Map(
      userAcademies.map((user) => [user.id, user.academyId])
    )
    const duplicateWhere = params.entityType && params.entityId
      ? {
          userId: {
            in: uniqueUserIds,
          },
          type: params.type,
          title: params.title,
          message: params.message,
          entityType: params.entityType,
          entityId: params.entityId,
        }
      : null
    const existingNotifications = duplicateWhere
      ? await prisma.notification.findMany({
          where: duplicateWhere,
          select: {
            userId: true,
          },
        })
      : []
    const existingUserIds = new Set(
      existingNotifications.map((notification) => notification.userId)
    )
    const targetUserIds = uniqueUserIds.filter(
      (userId) => !existingUserIds.has(userId)
    )

    if (targetUserIds.length === 0) {
      return []
    }

    const notifications = await prisma.$transaction(
      targetUserIds.map((userId) =>
        prisma.notification.create({
          data: {
            academyId:
              params.academyId === undefined
                ? academyIdByUserId.get(userId)
                : params.academyId ?? undefined,
            userId,
            type: params.type,
            title: params.title,
            message: params.message,
            actionUrl: params.actionUrl ?? null,
            entityType: params.entityType,
            entityId: params.entityId,
          },
        })
      )
    )

    return notifications
  } catch (error) {
    console.error("Failed to create bulk notifications:", error)
    return []
  }
}

export async function notifyUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) {
  return createNotificationsForMany(userIds, params)
}

async function getClassParticipantContext(classId: string) {
  return prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      academyId: true,
      name: true,
      scheduleDays: true,
      scheduleStartTime: true,
      scheduleEndTime: true,
      defaultMeetingPlatform: true,
      defaultMeetingLink: true,
      course: {
        select: {
          code: true,
          name: true,
        },
      },
      teachers: {
        select: {
          teacherProfile: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
      enrollments: {
        where: { status: "active" },
        select: {
          studentProfile: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              parentLinks: {
                select: {
                  parentProfile: {
                    select: {
                      user: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
}

function getClassLabel(classData: Pick<ClassParticipantContext, "course" | "name">) {
  return `${classData.course.code}: ${classData.name}`
}

function formatScheduleSummary(
  classData: Pick<
    ClassParticipantContext,
    "scheduleDays" | "scheduleStartTime" | "scheduleEndTime" | "defaultMeetingPlatform"
  >
) {
  if (
    classData.scheduleDays.length === 0 ||
    !classData.scheduleStartTime ||
    !classData.scheduleEndTime
  ) {
    return "Schedule details were updated."
  }

  const days = classData.scheduleDays
    .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
    .join(", ")

  return `${days}, ${classData.scheduleStartTime} - ${classData.scheduleEndTime} (${classData.defaultMeetingPlatform.replace("_", " ")})`
}

function getParentUserIdsForStudent(
  studentProfile: ClassParticipantContext["enrollments"][number]["studentProfile"]
) {
  return studentProfile.parentLinks.map((link) => link.parentProfile.user.id)
}

export async function notifyStudentAndParents(input: {
  academyId: string
  studentProfileId: string
  studentUserId: string
  parentUserIds: string[]
  studentTitle: string
  studentMessage: string
  parentTitle?: string
  parentMessage: string
  studentActionUrl?: string | null
  parentActionUrl?: string | null
  type?: NotificationType
  entityType: string
  entityId: string
}) {
  await createNotification({
    academyId: input.academyId,
    userId: input.studentUserId,
    type: input.type ?? NotificationType.announcement,
    title: input.studentTitle,
    message: input.studentMessage,
    actionUrl: input.studentActionUrl,
    entityType: input.entityType,
    entityId: input.entityId,
  })

  await createNotificationsForMany(input.parentUserIds, {
    academyId: input.academyId,
    type: input.type ?? NotificationType.announcement,
    title: input.parentTitle ?? input.studentTitle,
    message: input.parentMessage,
    actionUrl: input.parentActionUrl,
    entityType: input.entityType,
    entityId: input.entityId,
  })
}

export async function notifyClassParticipants(input: {
  classId: string
  title: string
  message: string
  type?: NotificationType
  entityType: string
  entityId: string
  teacherActionUrl?: string | null
  studentActionUrl?: string | null
  parentActionUrl?: string | null
  includeTeachers?: boolean
  includeStudents?: boolean
  includeParents?: boolean
}) {
  const classData = await getClassParticipantContext(input.classId)

  if (!classData) {
    return
  }

  const type = input.type ?? NotificationType.announcement
  const includeTeachers = input.includeTeachers ?? true
  const includeStudents = input.includeStudents ?? true
  const includeParents = input.includeParents ?? true

  if (includeTeachers) {
    await createNotificationsForMany(
      classData.teachers.map((assignment) => assignment.teacherProfile.user.id),
      {
        academyId: classData.academyId,
        type,
        title: input.title,
        message: input.message,
        actionUrl:
          input.teacherActionUrl ?? `/teacher/classes/${classData.id}/sessions`,
        entityType: input.entityType,
        entityId: input.entityId,
      }
    )
  }

  if (includeStudents) {
    await createNotificationsForMany(
      classData.enrollments.map(
        (enrollment) => enrollment.studentProfile.user.id
      ),
      {
        academyId: classData.academyId,
        type,
        title: input.title,
        message: input.message,
        actionUrl: input.studentActionUrl ?? `/student/classes/${classData.id}`,
        entityType: input.entityType,
        entityId: input.entityId,
      }
    )
  }

  if (includeParents) {
    await createNotificationsForMany(
      classData.enrollments.flatMap((enrollment) =>
        getParentUserIdsForStudent(enrollment.studentProfile)
      ),
      {
        academyId: classData.academyId,
        type,
        title: input.title,
        message: input.message,
        actionUrl: input.parentActionUrl ?? "/parent/attendance",
        entityType: input.entityType,
        entityId: input.entityId,
      }
    )
  }
}

export async function notifyClassTeacherAssigned(
  classId: string,
  teacherProfileIds: string[]
) {
  const classData = await getClassParticipantContext(classId)

  if (!classData) {
    return
  }

  const targetTeacherProfileIds = new Set(teacherProfileIds.filter(Boolean))
  const teacherUserIds = classData.teachers
    .filter((assignment) =>
      targetTeacherProfileIds.has(assignment.teacherProfile.id)
    )
    .map((assignment) => assignment.teacherProfile.user.id)

  await createNotificationsForMany(teacherUserIds, {
    academyId: classData.academyId,
    type: NotificationType.announcement,
    title: "New Class Assignment",
    message: `You have been assigned to a new class: ${classData.name}`,
    actionUrl: `/teacher/classes/${classData.id}/sessions`,
    entityType: "class_teacher",
    entityId: classData.id,
  })
}

export async function notifyStudentsEnrolledInClass(
  classId: string,
  studentProfileIds: string[]
) {
  const classData = await getClassParticipantContext(classId)

  if (!classData) {
    return
  }

  const targetStudentProfileIds = new Set(studentProfileIds.filter(Boolean))
  const className = classData.name

  for (const enrollment of classData.enrollments) {
    const student = enrollment.studentProfile

    if (!targetStudentProfileIds.has(student.id)) {
      continue
    }

    const studentName = `${student.user.firstName} ${student.user.lastName}`

    await notifyStudentAndParents({
      academyId: classData.academyId,
      studentProfileId: student.id,
      studentUserId: student.user.id,
      parentUserIds: getParentUserIdsForStudent(student),
      studentTitle: "Class Enrollment",
      studentMessage: `You have been enrolled in ${className}`,
      parentTitle: "Class Enrollment",
      parentMessage: `${studentName} has been enrolled in ${className}`,
      studentActionUrl: `/student/classes/${classData.id}`,
      parentActionUrl: "/parent/attendance",
      type: NotificationType.announcement,
      entityType: "enrollment",
      entityId: `${classData.id}:${student.id}`,
    })
  }
}

export async function notifyClassScheduleChanged(classId: string) {
  const classData = await getClassParticipantContext(classId)

  if (!classData) {
    return
  }

  await notifyClassParticipants({
    classId,
    type: NotificationType.announcement,
    title: "Class Schedule Updated",
    message: `Schedule for ${getClassLabel(classData)} has been updated: ${formatScheduleSummary(classData)}.`,
    entityType: "class_schedule",
    entityId: classId,
  })
}

export async function notifyCourseChanged(
  courseId: string,
  action: "created" | "updated"
) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      code: true,
      name: true,
      updatedAt: true,
      classes: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!course) {
    return
  }

  await Promise.all(
    course.classes.map((classData) =>
      notifyClassParticipants({
        classId: classData.id,
        type: NotificationType.announcement,
        title: action === "created" ? "Course Created" : "Course Updated",
        message: `${course.code}: ${course.name} has been ${action} for ${classData.name}.`,
        teacherActionUrl: `/teacher/classes/${classData.id}/sessions`,
        studentActionUrl: `/student/classes/${classData.id}`,
        parentActionUrl: "/parent/attendance",
        entityType: "course",
        entityId:
          action === "updated"
            ? `${course.id}:${classData.id}:${course.updatedAt.toISOString()}`
            : `${course.id}:${classData.id}:created`,
      })
    )
  )
}

async function getInvoiceStudentContext(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              academyId: true,
            },
          },
          parentLinks: {
            include: {
              parentProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
}

export async function notifyInvoiceCreated(invoiceId: string) {
  const invoice = await getInvoiceStudentContext(invoiceId)

  if (!invoice) {
    return
  }

  const studentName = `${invoice.studentProfile.user.firstName} ${invoice.studentProfile.user.lastName}`
  const parentUserIds = invoice.studentProfile.parentLinks.map(
    (link) => link.parentProfile.user.id
  )

  await notifyStudentAndParents({
    academyId: invoice.studentProfile.user.academyId,
    studentProfileId: invoice.studentProfile.id,
    studentUserId: invoice.studentProfile.user.id,
    parentUserIds,
    studentTitle: "New Invoice Created",
    studentMessage: `A new invoice has been created for you: ${invoice.invoiceNumber}`,
    parentTitle: "New Invoice Created",
    parentMessage: `A new invoice has been created for ${studentName}: ${invoice.invoiceNumber}`,
    studentActionUrl: `/student/finance/invoices/${invoice.id}`,
    parentActionUrl: `/parent/finance/invoices/${invoice.id}`,
    type: NotificationType.invoice_sent,
    entityType: "invoice_created",
    entityId: invoice.id,
  })
}

export async function notifyInvoiceUpdated(invoiceId: string) {
  const invoice = await getInvoiceStudentContext(invoiceId)

  if (!invoice) {
    return
  }

  const studentName = `${invoice.studentProfile.user.firstName} ${invoice.studentProfile.user.lastName}`
  const parentUserIds = invoice.studentProfile.parentLinks.map(
    (link) => link.parentProfile.user.id
  )

  await notifyStudentAndParents({
    academyId: invoice.studentProfile.user.academyId,
    studentProfileId: invoice.studentProfile.id,
    studentUserId: invoice.studentProfile.user.id,
    parentUserIds,
    studentTitle: "Invoice Updated",
    studentMessage: `Invoice ${invoice.invoiceNumber} has been updated.`,
    parentTitle: "Invoice Updated",
    parentMessage: `Invoice ${invoice.invoiceNumber} for ${studentName} has been updated.`,
    studentActionUrl: `/student/finance/invoices/${invoice.id}`,
    parentActionUrl: `/parent/finance/invoices/${invoice.id}`,
    type: NotificationType.invoice_sent,
    entityType: "invoice_updated",
    entityId: `${invoice.id}:${invoice.updatedAt.toISOString()}`,
  })
}

export async function notifyFeePlanChanged(
  feePlanId: string,
  action: "created" | "updated"
) {
  const feePlan = await prisma.feePlan.findUnique({
    where: { id: feePlanId },
    include: {
      classAssignments: {
        include: {
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!feePlan) {
    return
  }

  await Promise.all(
    feePlan.classAssignments.map((assignment) =>
      notifyClassParticipants({
        classId: assignment.classId,
        type: NotificationType.fee_due,
        title: action === "created" ? "Fee Plan Created" : "Fee Plan Updated",
        message: `${feePlan.name} has been ${action} for ${assignment.class.name}.`,
        studentActionUrl: "/student/finance",
        parentActionUrl: "/parent/finance",
        includeTeachers: false,
        entityType: "fee_plan",
        entityId:
          action === "updated"
            ? `${feePlan.id}:${assignment.classId}:${feePlan.updatedAt.toISOString()}`
            : `${feePlan.id}:${assignment.classId}:created`,
      })
    )
  )
}

export async function notifyFeePlanAssignedToClass(
  feePlanId: string,
  classId: string
) {
  const feePlan = await prisma.feePlan.findUnique({
    where: { id: feePlanId },
    select: {
      id: true,
      name: true,
    },
  })

  if (!feePlan) {
    return
  }

  await notifyClassParticipants({
    classId,
    type: NotificationType.fee_due,
    title: "Fee Plan Assigned",
    message: `${feePlan.name} has been assigned to your class.`,
    studentActionUrl: "/student/finance",
    parentActionUrl: "/parent/finance",
    includeTeachers: false,
    entityType: "class_fee_plan",
    entityId: `${feePlan.id}:${classId}`,
  })
}

export async function notifyReportPublished(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          parentLinks: {
            include: {
              parentProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      class: {
        include: {
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

  if (!report) {
    return
  }

  const studentName = `${report.studentProfile.user.firstName} ${report.studentProfile.user.lastName}`
  const className = `${report.class.course.code}: ${report.class.name}`

  await createNotification({
    userId: report.studentProfile.user.id,
    type: "report_published",
    title: "New Report Available",
    message: `Your ${report.reportType} report for ${className} has been published.`,
    actionUrl: `/student/reports/${report.id}`,
    entityType: "report",
    entityId: report.id,
  })

  const parentUserIds = report.studentProfile.parentLinks.map(
    (link) => link.parentProfile.user.id
  )

  await createNotificationsForMany(parentUserIds, {
    type: "report_published",
    title: "New Report Available",
    message: `${studentName}'s ${report.reportType} report for ${className} has been published.`,
    actionUrl: `/parent/reports/${report.id}`,
    entityType: "report",
    entityId: report.id,
  })
}

export async function notifyInvoiceSent(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          parentLinks: {
            include: {
              parentProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!invoice) {
    return
  }

  const studentName = `${invoice.studentProfile.user.firstName} ${invoice.studentProfile.user.lastName}`

  await createNotification({
    userId: invoice.studentProfile.user.id,
    type: "invoice_sent",
    title: "New Invoice",
    message: `A new invoice (${invoice.invoiceNumber}) for ${invoice.currency} ${invoice.totalAmount} has been issued.`,
    actionUrl: `/student/finance/invoices/${invoice.id}`,
    entityType: "invoice",
    entityId: invoice.id,
  })

  const parentUserIds = invoice.studentProfile.parentLinks.map(
    (link) => link.parentProfile.user.id
  )

  await createNotificationsForMany(parentUserIds, {
    type: "invoice_sent",
    title: "New Invoice",
    message: `A new invoice (${invoice.invoiceNumber}) for ${studentName} (${invoice.currency} ${invoice.totalAmount}) has been issued.`,
    actionUrl: `/parent/finance/invoices/${invoice.id}`,
    entityType: "invoice",
    entityId: invoice.id,
  })
}

export async function notifyPaymentReceived(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        include: {
          studentProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              parentLinks: {
                include: {
                  parentProfile: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          firstName: true,
                          lastName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!payment) {
    return
  }

  const studentName = `${payment.invoice.studentProfile.user.firstName} ${payment.invoice.studentProfile.user.lastName}`

  await createNotification({
    userId: payment.invoice.studentProfile.user.id,
    type: "payment_received",
    title: "Payment Received",
    message: `Payment of ${payment.currency} ${payment.amount} has been received for invoice ${payment.invoice.invoiceNumber}.`,
    actionUrl: `/student/finance/invoices/${payment.invoice.id}`,
    entityType: "payment",
    entityId: payment.id,
  })

  const parentUserIds = payment.invoice.studentProfile.parentLinks.map(
    (link) => link.parentProfile.user.id
  )

  await createNotificationsForMany(parentUserIds, {
    type: "payment_received",
    title: "Payment Received",
    message: `Payment of ${payment.currency} ${payment.amount} has been received for ${studentName}'s invoice ${payment.invoice.invoiceNumber}.`,
    actionUrl: `/parent/finance/invoices/${payment.invoice.id}`,
    entityType: "payment",
    entityId: payment.id,
  })
}

export async function notifyInvoiceOverdue(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          parentLinks: {
            include: {
              parentProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!invoice) {
    return
  }

  const studentName = `${invoice.studentProfile.user.firstName} ${invoice.studentProfile.user.lastName}`

  await createNotification({
    userId: invoice.studentProfile.user.id,
    type: "payment_overdue",
    title: "Payment Overdue",
    message: `Invoice ${invoice.invoiceNumber} is now overdue. Please make payment as soon as possible.`,
    actionUrl: `/student/finance/invoices/${invoice.id}`,
    entityType: "invoice",
    entityId: invoice.id,
  })

  const parentUserIds = invoice.studentProfile.parentLinks.map(
    (link) => link.parentProfile.user.id
  )

  await createNotificationsForMany(parentUserIds, {
    type: "payment_overdue",
    title: "Payment Overdue",
    message: `Invoice ${invoice.invoiceNumber} for ${studentName} is now overdue.`,
    actionUrl: `/parent/finance/invoices/${invoice.id}`,
    entityType: "invoice",
    entityId: invoice.id,
  })
}

export async function notifyAttendanceMarked(
  sessionId: string,
  studentId: string,
  status: string
) {
  if (status !== "absent" && status !== "late") {
    return
  }

  const attendance = await prisma.attendance.findFirst({
    where: {
      classSessionId: sessionId,
      studentProfileId: studentId,
    },
    include: {
      classSession: {
        include: {
          class: {
            include: {
              course: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      studentProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          parentLinks: {
            include: {
              parentProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!attendance) {
    return
  }

  const studentName = `${attendance.studentProfile.user.firstName} ${attendance.studentProfile.user.lastName}`
  const className = `${attendance.classSession.class.course.code}: ${attendance.classSession.class.name}`
  const sessionDate = new Date(
    attendance.classSession.sessionDate
  ).toLocaleDateString()

  const title = status === "absent" ? "Absence Recorded" : "Late Arrival Recorded"
  const message =
    status === "absent"
      ? `${studentName} was marked absent for ${className} on ${sessionDate}.`
      : `${studentName} was marked late for ${className} on ${sessionDate}.`

  const parentUserIds = attendance.studentProfile.parentLinks.map(
    (link) => link.parentProfile.user.id
  )

  await createNotificationsForMany(parentUserIds, {
    type: "attendance",
    title,
    message,
    actionUrl: `/parent/attendance?childId=${attendance.studentProfile.id}`,
    entityType: "attendance",
    entityId: attendance.id,
  })
}

export async function notifyStudentLateJoin(
  sessionId: string,
  studentId: string,
  lateMinutes: number
) {
  const attendance = await prisma.attendance.findFirst({
    where: {
      classSessionId: sessionId,
      studentProfileId: studentId,
    },
    include: {
      classSession: {
        include: {
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
              teachers: {
                select: {
                  teacherProfile: {
                    select: {
                      user: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      studentProfile: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          parentLinks: {
            include: {
              parentProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!attendance) {
    return
  }

  const studentName = `${attendance.studentProfile.user.firstName} ${attendance.studentProfile.user.lastName}`
  const className = `${attendance.classSession.class.course.code}: ${attendance.classSession.class.name}`
  const sessionDate = attendance.classSession.sessionDate.toLocaleDateString()

  const parentUserIds = attendance.studentProfile.parentLinks.map(
    (link) => link.parentProfile.user.id
  )
  const teacherUserIds = attendance.classSession.class.teachers.map(
    (assignment) => assignment.teacherProfile.user.id
  )
  const admins = await prisma.user.findMany({
    where: {
      academyId: attendance.classSession.class.academyId,
      role: Role.admin,
    },
    select: {
      id: true,
    },
  })
  const dateParam = attendance.classSession.sessionDate.toISOString().slice(0, 10)

  await createNotificationsForMany(parentUserIds, {
    type: "attendance",
    title: "Late Join Recorded",
    message: `${studentName} joined ${className} ${lateMinutes} minute${lateMinutes === 1 ? "" : "s"} late on ${sessionDate}.`,
    actionUrl: `/parent/attendance?childId=${attendance.studentProfile.id}`,
    entityType: "attendance",
    entityId: attendance.id,
  })

  await createNotificationsForMany(teacherUserIds, {
    type: "attendance",
    title: "Student Joined Late",
    message: `${studentName} joined ${className} ${lateMinutes} minute${lateMinutes === 1 ? "" : "s"} late on ${sessionDate}.`,
    actionUrl: `/teacher/sessions/${attendance.classSessionId}`,
    entityType: "attendance",
    entityId: attendance.id,
  })

  await createNotificationsForMany(
    admins.map((admin) => admin.id),
    {
      type: "attendance",
      title: "Student Joined Late",
      message: `${studentName} joined ${className} ${lateMinutes} minute${lateMinutes === 1 ? "" : "s"} late on ${sessionDate}.`,
      actionUrl: `/admin/attendance?classId=${attendance.classSession.class.id}&date=${dateParam}`,
      entityType: "attendance",
      entityId: attendance.id,
    }
  )
}

export async function notifyTeacherLateJoin(
  sessionId: string,
  teacherProfileId: string,
  lateMinutes: number
) {
  const teacherJoin = await prisma.teacherSessionJoin.findUnique({
    where: {
      classSessionId_teacherProfileId: {
        classSessionId: sessionId,
        teacherProfileId,
      },
    },
    include: {
      teacherProfile: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      classSession: {
        include: {
          class: {
            include: {
              course: {
                select: {
                  code: true,
                  name: true,
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
                      user: {
                        select: {
                          id: true,
                        },
                      },
                      parentLinks: {
                        select: {
                          parentProfile: {
                            select: {
                              user: {
                                select: {
                                  id: true,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!teacherJoin) {
    return
  }

  const admins = await prisma.user.findMany({
    where: {
      academyId: teacherJoin.classSession.class.academyId,
      role: Role.admin,
    },
    select: {
      id: true,
    },
  })

  const teacherName = `${teacherJoin.teacherProfile.user.firstName} ${teacherJoin.teacherProfile.user.lastName}`
  const className = `${teacherJoin.classSession.class.course.code}: ${teacherJoin.classSession.class.name}`
  const sessionDate = teacherJoin.classSession.sessionDate.toLocaleDateString()
  const dateParam = teacherJoin.classSession.sessionDate.toISOString().slice(0, 10)
  const studentUserIds = teacherJoin.classSession.class.enrollments.map(
    (enrollment) => enrollment.studentProfile.user.id
  )
  const parentUserIds = teacherJoin.classSession.class.enrollments.flatMap(
    (enrollment) =>
      enrollment.studentProfile.parentLinks.map(
        (link) => link.parentProfile.user.id
      )
  )

  await createNotificationsForMany(
    admins.map((admin) => admin.id),
    {
      type: "attendance",
      title: "Teacher Joined Late",
      message: `${teacherName} joined ${className} ${lateMinutes} minute${lateMinutes === 1 ? "" : "s"} late on ${sessionDate}.`,
      actionUrl: `/admin/attendance?classId=${teacherJoin.classSession.class.id}&date=${dateParam}`,
      entityType: "session",
      entityId: teacherJoin.classSession.id,
    }
  )

  await createNotificationsForMany(studentUserIds, {
    type: "attendance",
    title: "Teacher Joined Late",
    message: `${teacherName} joined ${className} ${lateMinutes} minute${lateMinutes === 1 ? "" : "s"} late on ${sessionDate}.`,
    actionUrl: `/student/classes/${teacherJoin.classSession.class.id}`,
    entityType: "session",
    entityId: teacherJoin.classSession.id,
  })

  await createNotificationsForMany(parentUserIds, {
    type: "attendance",
    title: "Teacher Joined Late",
    message: `${teacherName} joined ${className} ${lateMinutes} minute${lateMinutes === 1 ? "" : "s"} late on ${sessionDate}.`,
    actionUrl: "/parent/attendance",
    entityType: "session",
    entityId: teacherJoin.classSession.id,
  })
}

function getPayrollActionUrlForRole(role: Role, recordId: string) {
  if (role === Role.admin) {
    return `/admin/payroll/${recordId}`
  }

  if (role === Role.teacher) {
    return `/teacher/payroll/${recordId}`
  }

  return null
}

async function getPayrollNotificationContext(recordId: string) {
  const record = await prisma.payrollRecord.findUnique({
    where: { id: recordId },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          firstName: true,
          lastName: true,
        },
      },
      adjustments: {
        select: {
          type: true,
          amount: true,
        },
      },
    },
  })

  if (!record) {
    return null
  }

  const breakdown = calculatePayrollBreakdownTotals(
    toNumber(record.grossAmount),
    record.adjustments.map((adjustment) => ({
      type: adjustment.type,
      amount: toNumber(adjustment.amount),
    }))
  )

  return {
    record,
    periodLabel: formatPayrollPeriod(record.payYear, record.payMonth),
    netPayable: breakdown.netPayable,
  }
}

export async function notifyPayrollRecordCreated(recordId: string) {
  const context = await getPayrollNotificationContext(recordId)

  if (!context) {
    return
  }

  await createNotification({
    userId: context.record.user.id,
    type: NotificationType.payroll,
    title: "Payroll Record Created",
    message: `A payroll record for ${context.periodLabel} has been prepared with a net payable salary of ${context.record.currency} ${context.netPayable.toFixed(2)}.`,
    actionUrl: getPayrollActionUrlForRole(context.record.user.role, recordId),
    entityType: "payroll",
    entityId: recordId,
  })
}

export async function notifyPayrollRecordFinalized(recordId: string) {
  const context = await getPayrollNotificationContext(recordId)

  if (!context) {
    return
  }

  await createNotification({
    userId: context.record.user.id,
    type: NotificationType.payroll,
    title: "Payroll Finalized",
    message: `Your ${context.periodLabel} payroll has been finalized and your salary slip is ready to download.`,
    actionUrl: getPayrollActionUrlForRole(context.record.user.role, recordId),
    entityType: "payroll",
    entityId: recordId,
  })
}

export async function notifyPayrollPaid(recordId: string) {
  const context = await getPayrollNotificationContext(recordId)

  if (!context) {
    return
  }

  await createNotification({
    userId: context.record.user.id,
    type: NotificationType.payroll,
    title: "Salary Paid",
    message: `Your ${context.periodLabel} salary of ${context.record.currency} ${context.netPayable.toFixed(2)} has been marked as paid.`,
    actionUrl: getPayrollActionUrlForRole(context.record.user.role, recordId),
    entityType: "payroll",
    entityId: recordId,
  })
}

export async function notifyPayrollAdjustmentAdded(adjustmentId: string) {
  const adjustment = await prisma.payrollAdjustment.findUnique({
    where: { id: adjustmentId },
    include: {
      payrollRecord: {
        include: {
          user: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      },
    },
  })

  if (!adjustment) {
    return
  }

  await createNotification({
    userId: adjustment.payrollRecord.user.id,
    type: NotificationType.payroll,
    title:
      adjustment.type === "bonus"
        ? "Payroll Bonus Added"
        : "Payroll Deduction Added",
    message: `${adjustment.type === "bonus" ? "A bonus" : "An adjustment"} of ${adjustment.payrollRecord.currency} ${toNumber(adjustment.amount).toFixed(2)} was added for ${formatPayrollPeriod(adjustment.payrollRecord.payYear, adjustment.payrollRecord.payMonth)}. Reason: ${adjustment.reason}.`,
    actionUrl: getPayrollActionUrlForRole(
      adjustment.payrollRecord.user.role,
      adjustment.payrollRecord.id
    ),
    entityType: "payroll_adjustment",
    entityId: adjustment.id,
  })
}

export async function notifyPostPublished(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          academyId: true,
        },
      },
      class: {
        include: {
          enrollments: {
            where: { status: "active" },
            include: {
              studentProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                    },
                  },
                  parentLinks: {
                    include: {
                      parentProfile: {
                        include: {
                          user: {
                            select: {
                              id: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!post) {
    return
  }

  const authorName = `${post.author.firstName} ${post.author.lastName}`
  const recipientRoles = new Map<string, Role>()

  if (post.class) {
    for (const enrollment of post.class.enrollments) {
      const student = enrollment.studentProfile

      if (
        post.visibility === PostVisibility.everyone ||
        post.visibility === PostVisibility.students_only ||
        post.visibility === PostVisibility.class_only
      ) {
        recipientRoles.set(student.user.id, Role.student)
      }

      if (
        post.visibility === PostVisibility.everyone ||
        post.visibility === PostVisibility.parents_only ||
        post.visibility === PostVisibility.class_only
      ) {
        for (const link of student.parentLinks) {
          recipientRoles.set(link.parentProfile.user.id, Role.parent)
        }
      }
    }
  } else {
    const academyUsers = await prisma.user.findMany({
      where: {
        academyId: post.author.academyId,
        role: {
          in:
            post.visibility === PostVisibility.students_only
              ? [Role.student]
              : post.visibility === PostVisibility.parents_only
                ? [Role.parent]
                : [Role.student, Role.parent, Role.teacher],
        },
      },
      select: {
        id: true,
        role: true,
      },
    })

    for (const user of academyUsers) {
      recipientRoles.set(user.id, user.role)
    }
  }

  recipientRoles.delete(post.author.id)

  const classLabel = post.class ? ` in ${post.class.name}` : ""
  await Promise.all(
    [...recipientRoles.entries()].map(([userId, role]) =>
      createNotification({
        academyId: post.author.academyId,
        userId,
        type: NotificationType.announcement,
        title: `New Announcement: ${post.title}`,
        message: `${authorName} posted${classLabel}: ${post.content.substring(0, 100)}${post.content.length > 100 ? "..." : ""}`,
        actionUrl: getPostActionUrlForRole(role, post.id),
        entityType: "post",
        entityId: post.id,
      })
    )
  )
}

export async function notifyCommentReply(commentId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      post: {
        select: {
          id: true,
          title: true,
        },
      },
      parentComment: {
        include: {
          author: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      },
      author: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (!comment?.parentComment || comment.authorUserId === comment.parentComment.author.id) {
    return
  }

  const replyAuthorName = `${comment.author.firstName} ${comment.author.lastName}`

  await createNotification({
    userId: comment.parentComment.author.id,
    type: "comment_reply",
    title: "New Reply to Your Comment",
    message: `${replyAuthorName} replied to your comment on "${comment.post.title}".`,
    actionUrl: getPostActionUrlForRole(
      comment.parentComment.author.role,
      comment.post.id,
      comment.id
    ),
    entityType: "comment",
    entityId: comment.id,
  })
}

export async function notifyManualPaymentSubmitted(submissionId: string) {
  const submission = await prisma.manualPaymentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          currency: true,
          studentProfile: {
            include: {
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
      submittedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (!submission) {
    return
  }

  const submitterName = `${submission.submittedBy.firstName} ${submission.submittedBy.lastName}`
  const studentName = `${submission.invoice.studentProfile.user.firstName} ${submission.invoice.studentProfile.user.lastName}`

  const admins = await prisma.user.findMany({
    where: {
      academyId: submission.academyId,
      role: Role.admin,
    },
    select: {
      id: true,
    },
  })

  await createNotificationsForMany(
    admins.map((admin) => admin.id),
    {
      type: NotificationType.payment_received,
      title: "New Payment Submission",
      message: `${submitterName} submitted payment proof of ${submission.invoice.currency} ${submission.amount} for ${studentName} (Invoice: ${submission.invoice.invoiceNumber}).`,
      actionUrl: `/admin/finance/manual-payments/${submission.id}`,
      entityType: "manual_payment",
      entityId: submission.id,
    }
  )
}

export async function notifyManualPaymentApproved(submissionId: string) {
  const submission = await prisma.manualPaymentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      invoice: {
        include: {
          studentProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              parentLinks: {
                include: {
                  parentProfile: {
                    include: {
                      user: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      submittedBy: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  })

  if (!submission) {
    return
  }

  const studentName = `${submission.invoice.studentProfile.user.firstName} ${submission.invoice.studentProfile.user.lastName}`
  const submitterActionUrl = getInvoiceActionUrlForRole(
    submission.submittedBy.role,
    submission.invoice.id
  )

  if (submitterActionUrl) {
    await createNotification({
      userId: submission.submittedBy.id,
      type: NotificationType.payment_received,
      title: "Payment Approved",
      message: `Your payment of ${submission.invoice.currency} ${submission.amount} for invoice ${submission.invoice.invoiceNumber} has been approved.`,
      actionUrl: submitterActionUrl,
      entityType: "invoice",
      entityId: submission.invoice.id,
    })
  }

  if (submission.invoice.studentProfile.user.id !== submission.submittedBy.id) {
    const studentActionUrl = getInvoiceActionUrlForRole(
      Role.student,
      submission.invoice.id
    )

    if (studentActionUrl) {
      await createNotification({
        userId: submission.invoice.studentProfile.user.id,
        type: NotificationType.payment_received,
        title: "Payment Received",
        message: `A payment of ${submission.invoice.currency} ${submission.amount} has been approved for invoice ${submission.invoice.invoiceNumber}.`,
        actionUrl: studentActionUrl,
        entityType: "invoice",
        entityId: submission.invoice.id,
      })
    }
  }

  const parentUserIds = submission.invoice.studentProfile.parentLinks
    .map((link) => link.parentProfile.user.id)
    .filter((userId) => userId !== submission.submittedBy.id)

  await createNotificationsForMany(parentUserIds, {
    type: NotificationType.payment_received,
    title: "Payment Received",
    message: `A payment of ${submission.invoice.currency} ${submission.amount} for ${studentName} has been approved (Invoice: ${submission.invoice.invoiceNumber}).`,
    actionUrl: getInvoiceActionUrlForRole(Role.parent, submission.invoice.id),
    entityType: "invoice",
    entityId: submission.invoice.id,
  })
}

export async function notifyManualPaymentRejected(submissionId: string) {
  const submission = await prisma.manualPaymentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
      submittedBy: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  })

  if (!submission) {
    return
  }

  const actionUrl = getInvoiceActionUrlForRole(
    submission.submittedBy.role,
    submission.invoice.id
  )

  await createNotification({
    userId: submission.submittedBy.id,
    type: NotificationType.payment_received,
    title: "Payment Submission Rejected",
    message: `Your payment submission for invoice ${submission.invoice.invoiceNumber} was rejected. Reason: ${submission.rejectionReason || "No reason provided"}`,
    actionUrl,
    entityType: "invoice",
    entityId: submission.invoice.id,
  })
}
