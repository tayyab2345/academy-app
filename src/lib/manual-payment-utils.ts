import path from "path"
import { PaymentMethod, Prisma, Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const manualSubmissionPaymentMethods = [
  "jazzcash",
  "easypaisa",
  "bank_transfer",
  "cash",
  "other",
] as const

export type ManualSubmissionPaymentMethod =
  (typeof manualSubmissionPaymentMethods)[number]

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank Transfer",
  online: "Online Payment",
  manual: "Manual Entry",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  other: "Other",
}

export const manualSubmissionPaymentMethodLabels: Record<
  ManualSubmissionPaymentMethod,
  string
> = {
  jazzcash: paymentMethodLabels.jazzcash,
  easypaisa: paymentMethodLabels.easypaisa,
  bank_transfer: paymentMethodLabels.bank_transfer,
  cash: paymentMethodLabels.cash,
  other: paymentMethodLabels.other,
}

export interface FinanceAccessUser {
  id: string
  role: Role
  academyId: string
}

async function getStudentProfileId(userId: string) {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  return studentProfile?.id || null
}

async function getParentStudentIds(userId: string) {
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!parentProfile) {
    return []
  }

  const links = await prisma.parentStudentLink.findMany({
    where: { parentProfileId: parentProfile.id },
    select: { studentProfileId: true },
  })

  return links.map((link) => link.studentProfileId)
}

export async function getManualPaymentSubmissionWhereForUser(
  user: FinanceAccessUser,
  submissionId?: string
): Promise<Prisma.ManualPaymentSubmissionWhereInput | null> {
  let where: Prisma.ManualPaymentSubmissionWhereInput | null = null

  if (user.role === Role.admin) {
    where = {
      academyId: user.academyId,
    }
  } else if (user.role === Role.student) {
    const studentProfileId = await getStudentProfileId(user.id)

    if (studentProfileId) {
      where = {
        OR: [
          { submittedByUserId: user.id },
          { invoice: { studentProfileId } },
        ],
      }
    }
  } else if (user.role === Role.parent) {
    const studentIds = await getParentStudentIds(user.id)

    where = {
      OR: [
        { submittedByUserId: user.id },
        studentIds.length > 0
          ? {
              invoice: {
                studentProfileId: { in: studentIds },
              },
            }
          : undefined,
      ].filter(Boolean) as Prisma.ManualPaymentSubmissionWhereInput[],
    }
  }

  if (!where) {
    return null
  }

  if (!submissionId) {
    return where
  }

  return {
    AND: [where, { id: submissionId }],
  }
}

export function getInvoiceActionUrlForRole(role: Role, invoiceId: string) {
  if (role === Role.admin) {
    return `/admin/finance/invoices/${invoiceId}`
  }

  if (role === Role.student) {
    return `/student/finance/invoices/${invoiceId}`
  }

  if (role === Role.parent) {
    return `/parent/finance/invoices/${invoiceId}`
  }

  return null
}

export function buildStoredReceiptFilename(
  originalName: string,
  academyId?: string,
  userId?: string
) {
  const extension = path.extname(originalName || "").replace(/[^a-zA-Z0-9.]/g, "")
  const baseName = path
    .basename(originalName || "receipt", extension)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
  const ownerPrefix =
    academyId && userId ? `receipt_${academyId}_${userId}_` : "receipt_"

  return `${ownerPrefix}${baseName || "receipt"}${extension || ".bin"}`
}

export function parseStoredReceiptAccessInfo(fileName: string) {
  const match = /(?:^|_)receipt_([^_]+)_([^_]+)_.+$/.exec(fileName)

  if (!match) {
    return null
  }

  return {
    academyId: match[1],
    userId: match[2],
  }
}
