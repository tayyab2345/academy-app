import path from "path"
import { Prisma, Role } from "@prisma/client"
import { parseStoredCourseMediaAccessInfo } from "@/lib/course-media"
import { getManualPaymentSubmissionWhereForUser } from "@/lib/manual-payment-utils"
import { getPostWhereForUser } from "@/lib/post-access"
import { parseStoredPostImageAccessInfo } from "@/lib/post-media"
import { parseStoredBrandingAccessInfo } from "@/lib/profile-media"
import { parseStoredResultFileAccessInfo } from "@/lib/results/result-media"
import { getVisibleResultFileWhereForUser } from "@/lib/results/result-access"
import { getDocumentUrlFromRelativePath } from "@/lib/storage/document-storage"
import { prisma } from "@/lib/prisma"

export interface DocumentAccessUser {
  id: string
  role: Role
  academyId: string
}

async function getTeacherProfileId(userId: string) {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  return teacherProfile?.id || null
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

export async function getReportWhereForUser(
  user: DocumentAccessUser,
  reportId?: string
): Promise<Prisma.ReportWhereInput | null> {
  let where: Prisma.ReportWhereInput | null = null

  if (user.role === Role.admin) {
    where = {
      class: {
        academyId: user.academyId,
      },
    }
  } else if (user.role === Role.teacher) {
    const teacherProfileId = await getTeacherProfileId(user.id)

    if (teacherProfileId) {
      where = {
        teacherProfileId,
      }
    }
  } else if (user.role === Role.student) {
    const studentProfileId = await getStudentProfileId(user.id)

    if (studentProfileId) {
      where = {
        studentProfileId,
        status: "published",
      }
    }
  } else if (user.role === Role.parent) {
    const studentIds = await getParentStudentIds(user.id)

    if (studentIds.length > 0) {
      where = {
        studentProfileId: { in: studentIds },
        status: "published",
      }
    }
  }

  if (!where) {
    return null
  }

  if (!reportId) {
    return where
  }

  return {
    AND: [where, { id: reportId }],
  }
}

export async function getInvoiceWhereForUser(
  user: DocumentAccessUser,
  invoiceId?: string
): Promise<Prisma.InvoiceWhereInput | null> {
  let where: Prisma.InvoiceWhereInput | null = null

  if (user.role === Role.admin) {
    where = {
      studentProfile: {
        user: {
          academyId: user.academyId,
        },
      },
    }
  } else if (user.role === Role.student) {
    const studentProfileId = await getStudentProfileId(user.id)

    if (studentProfileId) {
      where = {
        studentProfileId,
        status: { not: "draft" },
      }
    }
  } else if (user.role === Role.parent) {
    const studentIds = await getParentStudentIds(user.id)

    if (studentIds.length > 0) {
      where = {
        studentProfileId: { in: studentIds },
        status: { not: "draft" },
      }
    }
  }

  if (!where) {
    return null
  }

  if (!invoiceId) {
    return where
  }

  return {
    AND: [where, { id: invoiceId }],
  }
}

export async function canUserAccessStoredDocument(
  user: DocumentAccessUser,
  relativePath: string
) {
  const brandingAccessInfo = parseStoredBrandingAccessInfo(
    path.posix.basename(relativePath)
  )

  if (brandingAccessInfo && brandingAccessInfo.academyId === user.academyId) {
    return true
  }

  const courseMediaAccessInfo = parseStoredCourseMediaAccessInfo(
    path.posix.basename(relativePath)
  )

  if (
    courseMediaAccessInfo &&
    courseMediaAccessInfo.academyId === user.academyId
  ) {
    return true
  }

  const postImageAccessInfo = parseStoredPostImageAccessInfo(
    path.posix.basename(relativePath)
  )

  if (
    postImageAccessInfo &&
    postImageAccessInfo.academyId === user.academyId &&
    (postImageAccessInfo.userId === user.id || user.role === Role.admin)
  ) {
    return true
  }

  const resultFileAccessInfo = parseStoredResultFileAccessInfo(
    path.posix.basename(relativePath)
  )

  if (
    resultFileAccessInfo &&
    resultFileAccessInfo.academyId === user.academyId &&
    (resultFileAccessInfo.userId === user.id || user.role === Role.admin)
  ) {
    return true
  }

  const fileUrl = getDocumentUrlFromRelativePath(relativePath)

  const postWhere = await getPostWhereForUser({
    userId: user.id,
    role: user.role,
    academyId: user.academyId,
  })

  const post = await prisma.post.findFirst({
    where: {
      AND: [postWhere, { imageUrl: fileUrl }],
    },
    select: { id: true },
  })

  if (post) {
    return true
  }

  const resultFileWhere = await getVisibleResultFileWhereForUser(user)

  if (resultFileWhere) {
    const resultFile = await prisma.resultFile.findFirst({
      where: {
        AND: [resultFileWhere, { fileUrl }],
      },
      select: { id: true },
    })

    if (resultFile) {
      return true
    }
  }

  const reportWhere = await getReportWhereForUser(user)

  if (reportWhere) {
    const report = await prisma.report.findFirst({
      where: {
        AND: [reportWhere, { pdfUrl: fileUrl }],
      },
      select: { id: true },
    })

    if (report) {
      return true
    }
  }

  const invoiceWhere = await getInvoiceWhereForUser(user)

  if (!invoiceWhere) {
    return false
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      AND: [invoiceWhere, { pdfUrl: fileUrl }],
    },
    select: { id: true },
  })

  if (invoice) {
    return true
  }

  const manualPaymentWhere = await getManualPaymentSubmissionWhereForUser(user)

  if (manualPaymentWhere) {
    const submission = await prisma.manualPaymentSubmission.findFirst({
      where: {
        AND: [manualPaymentWhere, { receiptUrl: fileUrl }],
      },
      select: { id: true },
    })

    if (submission) {
      return true
    }
  }

  const payment = await prisma.payment.findFirst({
    where: {
      receiptUrl: fileUrl,
      invoice: invoiceWhere || undefined,
    },
    select: { id: true },
  })

  return Boolean(payment)
}
