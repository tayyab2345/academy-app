import { Prisma, SubmissionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function getAcademyPaymentSettings(academyId: string) {
  const existing = await prisma.academyPaymentSettings.findUnique({
    where: { academyId },
  })

  if (existing) {
    return existing
  }

  return prisma.academyPaymentSettings.create({
    data: { academyId },
  })
}

const manualPaymentListInclude = {
  invoice: {
    include: {
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
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.ManualPaymentSubmissionInclude

export type ManualPaymentListItem = Prisma.ManualPaymentSubmissionGetPayload<{
  include: typeof manualPaymentListInclude
}>

export async function getManualPaymentsList(params: {
  academyId: string
  page: number
  limit: number
  status?: string
  invoiceId?: string
}) {
  const where: Prisma.ManualPaymentSubmissionWhereInput = {
    academyId: params.academyId,
  }

  if (params.status) {
    where.status = params.status as SubmissionStatus
  }

  if (params.invoiceId) {
    where.invoiceId = params.invoiceId
  }

  const [submissions, total, pendingCount, statusCounts, amountRows] = await Promise.all([
    prisma.manualPaymentSubmission.findMany({
      where,
      include: manualPaymentListInclude,
      orderBy: {
        createdAt: "desc",
      },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.manualPaymentSubmission.count({ where }),
    prisma.manualPaymentSubmission.count({
      where: {
        academyId: params.academyId,
        status: "pending",
      },
    }),
    prisma.manualPaymentSubmission.groupBy({
      by: ["status"],
      where: {
        academyId: params.academyId,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.manualPaymentSubmission.findMany({
      where: {
        academyId: params.academyId,
      },
      select: {
        amount: true,
        invoice: {
          select: {
            currency: true,
          },
        },
      },
    }),
  ])

  const statsByStatus = {
    pending: 0,
    approved: 0,
    rejected: 0,
  }

  for (const row of statusCounts) {
    statsByStatus[row.status] = row._count._all
  }

  const totalsByCurrencyMap = new Map<string, number>()

  for (const row of amountRows) {
    const currentAmount = totalsByCurrencyMap.get(row.invoice.currency) || 0
    totalsByCurrencyMap.set(
      row.invoice.currency,
      currentAmount + Number(row.amount)
    )
  }

  return {
    submissions,
    total,
    pendingCount,
    stats: {
      total: statsByStatus.pending + statsByStatus.approved + statsByStatus.rejected,
      pending: statsByStatus.pending,
      approved: statsByStatus.approved,
      rejected: statsByStatus.rejected,
      totalsByCurrency: Array.from(totalsByCurrencyMap.entries()).map(
        ([currency, amount]) => ({
          currency,
          amount,
        })
      ),
    },
    page: params.page,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  }
}

const manualPaymentDetailInclude = {
  invoice: {
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          parentLinks: {
            include: {
              parentProfile: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
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
      },
      adjustments: true,
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
  submittedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      email: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.ManualPaymentSubmissionInclude

export type ManualPaymentDetailItem = Prisma.ManualPaymentSubmissionGetPayload<{
  include: typeof manualPaymentDetailInclude
}>

export async function getManualPaymentSubmissionDetail(
  academyId: string,
  submissionId: string
) {
  return prisma.manualPaymentSubmission.findFirst({
    where: {
      id: submissionId,
      academyId,
    },
    include: manualPaymentDetailInclude,
  })
}
