import { Role } from "@prisma/client"
import { ensureStoredInvoicePdf } from "@/lib/pdf/document-service"
import { AcademyBranding } from "@/lib/pdf/pdf-utils"
import { prisma } from "@/lib/prisma"
import {
  getAppBaseUrl,
  getRoleBasedUrl,
  logEmailAttempt,
} from "@/lib/email/email-helpers"
import {
  EmailAttachment,
  isEmailConfigured,
  sendEmail,
} from "@/lib/email/email-service"
import { renderInvoiceSentEmail } from "@/lib/email/templates/invoice-sent"
import { renderPaymentReceivedEmail } from "@/lib/email/templates/payment-received"
import { renderReminderOverdueEmail } from "@/lib/email/templates/reminder-overdue"
import { renderReportPublishedEmail } from "@/lib/email/templates/report-published"

type WorkflowRole = "student" | "parent"

interface WorkflowRecipient {
  email: string
  name: string
  userId: string
  role: WorkflowRole
}

interface WorkflowResult {
  attempted: number
  sent: number
  failed: number
}

function getEmailProviderName() {
  return process.env.EMAIL_PROVIDER?.trim() || "resend"
}

function toAcademyBranding(academy: {
  name: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string | null
  contactEmail: string
}): AcademyBranding {
  return {
    name: academy.name,
    logoUrl: academy.logoUrl,
    primaryColor: academy.primaryColor,
    secondaryColor: academy.secondaryColor,
    contactEmail: academy.contactEmail,
  }
}

function dedupeRecipients<T extends WorkflowRecipient>(recipients: T[]) {
  return [...new Map(recipients.map((recipient) => [recipient.userId, recipient])).values()]
}

function buildNotConfiguredError(provider: string) {
  return `${provider} email provider is not configured`
}

async function logNotConfiguredAttempt(params: {
  recipient: WorkflowRecipient
  subject: string
  template: string
  entityType: string
  entityId: string
}) {
  const provider = getEmailProviderName()

  await logEmailAttempt({
    recipientEmail: params.recipient.email,
    recipientUserId: params.recipient.userId,
    subject: params.subject,
    template: params.template,
    status: "failed",
    provider,
    errorMessage: buildNotConfiguredError(provider),
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: {
      deliveryStatus: "not_configured",
    },
  })
}

async function logWorkflowEmailResult(params: {
  recipient: WorkflowRecipient
  subject: string
  template: string
  entityType: string
  entityId: string
  result: Awaited<ReturnType<typeof sendEmail>>
}) {
  await logEmailAttempt({
    recipientEmail: params.recipient.email,
    recipientUserId: params.recipient.userId,
    subject: params.subject,
    template: params.template,
    status: params.result.success ? "sent" : "failed",
    provider: params.result.provider,
    providerMessageId: params.result.messageId,
    errorMessage: params.result.error,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: {
      deliveryStatus: params.result.status,
    },
  })
}

export async function sendReportPublishedWorkflow(reportId: string): Promise<WorkflowResult> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
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
                      email: true,
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
          academy: {
            select: {
              name: true,
              logoUrl: true,
              primaryColor: true,
              secondaryColor: true,
              contactEmail: true,
            },
          },
        },
      },
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
    },
  })

  if (!report) {
    return { attempted: 0, sent: 0, failed: 0 }
  }

  const academy = toAcademyBranding(report.class.academy)
  const baseUrl = getAppBaseUrl()
  const emailConfigured = isEmailConfigured()
  const studentName = `${report.studentProfile.user.firstName} ${report.studentProfile.user.lastName}`
  const className = `${report.class.course.code}: ${report.class.name}`
  const teacherName = `${report.teacherProfile.user.firstName} ${report.teacherProfile.user.lastName}`
  const recipients = dedupeRecipients(
    [
      report.studentProfile.user.email
        ? {
            email: report.studentProfile.user.email,
            name: studentName,
            userId: report.studentProfile.user.id,
            role: Role.student,
          }
        : null,
      ...report.studentProfile.parentLinks.map((link) =>
        link.parentProfile.user.email
          ? {
              email: link.parentProfile.user.email,
              name: `${link.parentProfile.user.firstName} ${link.parentProfile.user.lastName}`,
              userId: link.parentProfile.user.id,
              role: Role.parent,
            }
          : null
      ),
    ].filter((recipient): recipient is WorkflowRecipient => Boolean(recipient))
  )

  let attempted = 0
  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    const reportUrl = getRoleBasedUrl(baseUrl, "report", reportId, recipient.role)
    const { html, subject } = renderReportPublishedEmail({
      studentName,
      parentName: recipient.role === Role.parent ? recipient.name : undefined,
      reportType: report.reportType,
      className,
      reportDate: report.reportDate,
      teacherName,
      reportUrl,
      academy,
    })

    attempted += 1

    if (!emailConfigured) {
      failed += 1
      await logNotConfiguredAttempt({
        recipient,
        subject,
        template: "report_published",
        entityType: "report",
        entityId: reportId,
      })
      continue
    }

    try {
      const result = await sendEmail({
        to: recipient.email,
        subject,
        html,
      })

      await logWorkflowEmailResult({
        recipient,
        subject,
        template: "report_published",
        entityType: "report",
        entityId: reportId,
        result,
      })

      if (result.success) {
        sent += 1
      } else {
        failed += 1
      }
    } catch (error) {
      failed += 1
      await logEmailAttempt({
        recipientEmail: recipient.email,
        recipientUserId: recipient.userId,
        subject,
        template: "report_published",
        status: "failed",
        provider: getEmailProviderName(),
        errorMessage: error instanceof Error ? error.message : "Unknown email workflow error",
        entityType: "report",
        entityId: reportId,
      })
    }
  }

  return { attempted, sent, failed }
}

export async function sendInvoiceSentWorkflow(invoiceId: string): Promise<WorkflowResult> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              academy: {
                select: {
                  name: true,
                  logoUrl: true,
                  primaryColor: true,
                  secondaryColor: true,
                  contactEmail: true,
                },
              },
            },
          },
          parentLinks: {
            include: {
              parentProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
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
    return { attempted: 0, sent: 0, failed: 0 }
  }

  const academy = toAcademyBranding(invoice.studentProfile.user.academy)
  const baseUrl = getAppBaseUrl()
  const emailConfigured = isEmailConfigured()
  const studentName = `${invoice.studentProfile.user.firstName} ${invoice.studentProfile.user.lastName}`
  const recipients = dedupeRecipients(
    [
      invoice.studentProfile.user.email
        ? {
            email: invoice.studentProfile.user.email,
            name: studentName,
            userId: invoice.studentProfile.user.id,
            role: Role.student,
          }
        : null,
      ...invoice.studentProfile.parentLinks.map((link) =>
        link.parentProfile.user.email
          ? {
              email: link.parentProfile.user.email,
              name: `${link.parentProfile.user.firstName} ${link.parentProfile.user.lastName}`,
              userId: link.parentProfile.user.id,
              role: Role.parent,
            }
          : null
      ),
    ].filter((recipient): recipient is WorkflowRecipient => Boolean(recipient))
  )

  let attachment: EmailAttachment | undefined

  if (emailConfigured) {
    try {
      const storedInvoicePdf = await ensureStoredInvoicePdf(invoiceId)

      if (storedInvoicePdf) {
        attachment = {
          filename: `Invoice_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
          content: storedInvoicePdf.buffer,
          contentType: "application/pdf",
        }
      }
    } catch (error) {
      console.error("Failed to prepare invoice PDF attachment:", error)
    }
  }

  let attempted = 0
  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    const invoiceUrl = getRoleBasedUrl(baseUrl, "invoice", invoiceId, recipient.role)
    const { html, subject } = renderInvoiceSentEmail({
      studentName,
      parentName: recipient.role === Role.parent ? recipient.name : undefined,
      invoiceNumber: invoice.invoiceNumber,
      description: invoice.description,
      amount: Number(invoice.totalAmount),
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      invoiceUrl,
      academy,
    })

    attempted += 1

    if (!emailConfigured) {
      failed += 1
      await logNotConfiguredAttempt({
        recipient,
        subject,
        template: "invoice_sent",
        entityType: "invoice",
        entityId: invoiceId,
      })
      continue
    }

    try {
      const result = await sendEmail({
        to: recipient.email,
        subject,
        html,
        attachments: attachment ? [attachment] : undefined,
      })

      await logWorkflowEmailResult({
        recipient,
        subject,
        template: "invoice_sent",
        entityType: "invoice",
        entityId: invoiceId,
        result,
      })

      if (result.success) {
        sent += 1
      } else {
        failed += 1
      }
    } catch (error) {
      failed += 1
      await logEmailAttempt({
        recipientEmail: recipient.email,
        recipientUserId: recipient.userId,
        subject,
        template: "invoice_sent",
        status: "failed",
        provider: getEmailProviderName(),
        errorMessage: error instanceof Error ? error.message : "Unknown email workflow error",
        entityType: "invoice",
        entityId: invoiceId,
      })
    }
  }

  return { attempted, sent, failed }
}

export async function sendPaymentReceivedWorkflow(paymentId: string): Promise<WorkflowResult> {
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
                  email: true,
                  firstName: true,
                  lastName: true,
                  academy: {
                    select: {
                      name: true,
                      logoUrl: true,
                      primaryColor: true,
                      secondaryColor: true,
                      contactEmail: true,
                    },
                  },
                },
              },
              parentLinks: {
                include: {
                  parentProfile: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          email: true,
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
          payments: {
            where: { status: "completed" },
            select: {
              amount: true,
            },
          },
          adjustments: {
            select: {
              amount: true,
              type: true,
            },
          },
        },
      },
    },
  })

  if (!payment) {
    return { attempted: 0, sent: 0, failed: 0 }
  }

  const academy = toAcademyBranding(payment.invoice.studentProfile.user.academy)
  const baseUrl = getAppBaseUrl()
  const emailConfigured = isEmailConfigured()
  const studentName = `${payment.invoice.studentProfile.user.firstName} ${payment.invoice.studentProfile.user.lastName}`
  const totalAdjustments = payment.invoice.adjustments.reduce((sum, adjustment) => {
    if (adjustment.type === "surcharge") {
      return sum + Number(adjustment.amount)
    }

    return sum - Number(adjustment.amount)
  }, 0)
  const totalPaid = payment.invoice.payments.reduce(
    (sum, existingPayment) => sum + Number(existingPayment.amount),
    0
  )
  const remainingBalance = Math.max(
    Number(payment.invoice.totalAmount) + totalAdjustments - totalPaid,
    0
  )
  const recipients = dedupeRecipients(
    [
      payment.invoice.studentProfile.user.email
        ? {
            email: payment.invoice.studentProfile.user.email,
            name: studentName,
            userId: payment.invoice.studentProfile.user.id,
            role: Role.student,
          }
        : null,
      ...payment.invoice.studentProfile.parentLinks.map((link) =>
        link.parentProfile.user.email
          ? {
              email: link.parentProfile.user.email,
              name: `${link.parentProfile.user.firstName} ${link.parentProfile.user.lastName}`,
              userId: link.parentProfile.user.id,
              role: Role.parent,
            }
          : null
      ),
    ].filter((recipient): recipient is WorkflowRecipient => Boolean(recipient))
  )

  let attempted = 0
  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    const invoiceUrl = getRoleBasedUrl(
      baseUrl,
      "invoice",
      payment.invoice.id,
      recipient.role
    )
    const { html, subject } = renderPaymentReceivedEmail({
      studentName,
      parentName: recipient.role === Role.parent ? recipient.name : undefined,
      invoiceNumber: payment.invoice.invoiceNumber,
      paymentAmount: Number(payment.amount),
      currency: payment.currency,
      paymentDate: payment.paymentDate,
      remainingBalance,
      invoiceUrl,
      academy,
    })

    attempted += 1

    if (!emailConfigured) {
      failed += 1
      await logNotConfiguredAttempt({
        recipient,
        subject,
        template: "payment_received",
        entityType: "payment",
        entityId: paymentId,
      })
      continue
    }

    try {
      const result = await sendEmail({
        to: recipient.email,
        subject,
        html,
      })

      await logWorkflowEmailResult({
        recipient,
        subject,
        template: "payment_received",
        entityType: "payment",
        entityId: paymentId,
        result,
      })

      if (result.success) {
        sent += 1
      } else {
        failed += 1
      }
    } catch (error) {
      failed += 1
      await logEmailAttempt({
        recipientEmail: recipient.email,
        recipientUserId: recipient.userId,
        subject,
        template: "payment_received",
        status: "failed",
        provider: getEmailProviderName(),
        errorMessage: error instanceof Error ? error.message : "Unknown email workflow error",
        entityType: "payment",
        entityId: paymentId,
      })
    }
  }

  return { attempted, sent, failed }
}

export async function sendOverdueReminderEmail(params: {
  recipient: WorkflowRecipient
  invoice: {
    id: string
    invoiceNumber: string
    description: string
    currency: string
    dueDate: Date
  }
  studentName: string
  outstandingAmount: number
  daysOverdue: number
  academy: AcademyBranding
}) {
  const invoiceUrl = getRoleBasedUrl(
    getAppBaseUrl(),
    "invoice",
    params.invoice.id,
    params.recipient.role
  )
  const { html, subject } = renderReminderOverdueEmail({
    studentName: params.studentName,
    parentName:
      params.recipient.role === Role.parent ? params.recipient.name : undefined,
    invoiceNumber: params.invoice.invoiceNumber,
    description: params.invoice.description,
    outstandingAmount: params.outstandingAmount,
    currency: params.invoice.currency,
    dueDate: params.invoice.dueDate,
    daysOverdue: params.daysOverdue,
    invoiceUrl,
    academy: params.academy,
  })

  const result = await sendEmail({
    to: params.recipient.email,
    subject,
    html,
  })

  await logWorkflowEmailResult({
    recipient: params.recipient,
    subject,
    template: "overdue_reminder",
    entityType: "invoice",
    entityId: params.invoice.id,
    result,
  })

  return {
    subject,
    invoiceUrl,
    result,
  }
}
