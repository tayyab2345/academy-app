import { NotificationType, PostVisibility, Role } from "@prisma/client"
import { getInvoiceActionUrlForRole } from "@/lib/manual-payment-utils"
import { getPostActionUrlForRole } from "@/lib/post-access"
import {
  calculatePayrollBreakdownTotals,
  formatPayrollPeriod,
  toNumber,
} from "@/lib/payroll/payroll-utils"
import { prisma } from "@/lib/prisma"

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string | null
  entityType?: string
  entityId?: string
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
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
    const notifications = await prisma.$transaction(
      uniqueUserIds.map((userId) =>
        prisma.notification.create({
          data: {
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

  await createNotificationsForMany(parentUserIds, {
    type: "attendance",
    title: "Late Join Recorded",
    message: `${studentName} joined ${className} ${lateMinutes} minute${lateMinutes === 1 ? "" : "s"} late on ${sessionDate}.`,
    actionUrl: `/parent/attendance?childId=${attendance.studentProfile.id}`,
    entityType: "attendance",
    entityId: attendance.id,
  })
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
  const notificationRows = [...recipientRoles.entries()].map(([userId, role]) =>
    prisma.notification.create({
      data: {
        userId,
        type: NotificationType.announcement,
        title: `New Announcement: ${post.title}`,
        message: `${authorName} posted${classLabel}: ${post.content.substring(0, 100)}${post.content.length > 100 ? "..." : ""}`,
        actionUrl: getPostActionUrlForRole(role, post.id),
        entityType: "post",
        entityId: post.id,
      },
    })
  )

  if (notificationRows.length > 0) {
    await prisma.$transaction(notificationRows)
  }
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
