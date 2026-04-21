import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getRoleBasedPath, hasRecentEmail, logEmailAttempt } from "@/lib/email/email-helpers"
import { sendOverdueReminderEmail } from "@/lib/email/email-workflows"
import { createNotification } from "@/lib/notification-service"
import { AcademyBranding } from "@/lib/pdf/pdf-utils"

interface OverdueReminderInvoice {
  id: string
  invoiceNumber: string
  description: string
  totalAmount: Prisma.Decimal | number
  currency: string
  dueDate: Date
  studentProfile: {
    user: {
      id: string
      firstName: string
      lastName: string
      email: string
      academy: {
        name: string
        logoUrl: string | null
        primaryColor: string
        secondaryColor: string | null
        contactEmail: string
      }
    }
    parentLinks: Array<{
      parentProfile: {
        user: {
          id: string
          email: string
          firstName: string
          lastName: string
        }
      }
    }>
  }
  payments: Array<{
    amount: Prisma.Decimal | number
    status: string
  }>
  adjustments: Array<{
    amount: Prisma.Decimal | number
    type: string
  }>
}

export async function sendOverdueReminders(): Promise<{
  processed: number
  sent: number
  skipped: number
  failed: number
  emailsAttempted: number
  notificationsCreated: number
}> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const overdueInvoices = (await prisma.invoice.findMany({
    where: {
      status: {
        in: ["sent", "partial", "overdue"],
      },
      dueDate: {
        lt: now,
        gte: thirtyDaysAgo,
      },
    },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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
        where: {
          status: "completed",
        },
        select: {
          amount: true,
          status: true,
        },
      },
      adjustments: {
        select: {
          amount: true,
          type: true,
        },
      },
    },
  })) as OverdueReminderInvoice[]

  let processed = 0
  let sent = 0
  let skipped = 0
  let failed = 0
  let emailsAttempted = 0
  let notificationsCreated = 0

  for (const invoice of overdueInvoices) {
    processed += 1

    const paidAmount = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    )
    const adjustmentTotal = invoice.adjustments.reduce((sum, adjustment) => {
      if (adjustment.type === "surcharge") {
        return sum + Number(adjustment.amount)
      }

      return sum - Number(adjustment.amount)
    }, 0)
    const outstandingAmount = Number(invoice.totalAmount) + adjustmentTotal - paidAmount

    if (outstandingAmount <= 0) {
      continue
    }

    const academy: AcademyBranding = {
      name: invoice.studentProfile.user.academy.name,
      logoUrl: invoice.studentProfile.user.academy.logoUrl,
      primaryColor: invoice.studentProfile.user.academy.primaryColor,
      secondaryColor: invoice.studentProfile.user.academy.secondaryColor,
      contactEmail: invoice.studentProfile.user.academy.contactEmail,
    }
    const studentName = `${invoice.studentProfile.user.firstName} ${invoice.studentProfile.user.lastName}`
    const daysOverdue = Math.floor(
      (now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const recipients = [
      {
        email: invoice.studentProfile.user.email,
        name: studentName,
        userId: invoice.studentProfile.user.id,
        role: "student" as const,
      },
      ...invoice.studentProfile.parentLinks.map((link) => ({
        email: link.parentProfile.user.email,
        name: `${link.parentProfile.user.firstName} ${link.parentProfile.user.lastName}`,
        userId: link.parentProfile.user.id,
        role: "parent" as const,
      })),
    ].filter((recipient) => Boolean(recipient.email))

    for (const recipient of recipients) {
      const alreadySent = await hasRecentEmail(
        recipient.email,
        "overdue_reminder",
        invoice.id,
        48
      )

      if (alreadySent) {
        skipped += 1
        continue
      }

      emailsAttempted += 1

      try {
        const { result } = await sendOverdueReminderEmail({
          recipient,
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            description: invoice.description,
            currency: invoice.currency,
            dueDate: invoice.dueDate,
          },
          studentName,
          outstandingAmount,
          daysOverdue,
          academy,
        })

        if (result.success) {
          sent += 1
        } else {
          failed += 1
        }

        const notification = await createNotification({
          userId: recipient.userId,
          type: "payment_overdue",
          title: "Payment Overdue Reminder",
          message: `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue. Please make payment as soon as possible.`,
          actionUrl: getRoleBasedPath("invoice", invoice.id, recipient.role),
          entityType: "invoice",
          entityId: invoice.id,
        })

        if (notification) {
          notificationsCreated += 1
        }
      } catch (error) {
        failed += 1
        await logEmailAttempt({
          recipientEmail: recipient.email,
          recipientUserId: recipient.userId,
          subject: `Reminder: Overdue Payment - ${invoice.invoiceNumber}`,
          template: "overdue_reminder",
          status: "failed",
          provider: process.env.EMAIL_PROVIDER?.trim() || "resend",
          errorMessage: error instanceof Error ? error.message : "Unknown overdue reminder error",
          entityType: "invoice",
          entityId: invoice.id,
        })
      }
    }
  }

  return {
    processed,
    sent,
    skipped,
    failed,
    emailsAttempted,
    notificationsCreated,
  }
}
