import { EmailStatus, Prisma, Role } from "@prisma/client"
import { getAppBaseUrl as getConfiguredAppBaseUrl } from "@/lib/app-url"
import { prisma } from "@/lib/prisma"

interface LogEmailParams {
  recipientEmail: string
  recipientUserId?: string
  subject: string
  template: string
  status: EmailStatus
  provider: string
  providerMessageId?: string
  errorMessage?: string
  entityType?: string
  entityId?: string
  metadata?: Prisma.InputJsonValue
}

export async function logEmailAttempt(params: LogEmailParams) {
  try {
    await prisma.emailLog.create({
      data: {
        recipientEmail: params.recipientEmail,
        recipientUserId: params.recipientUserId,
        subject: params.subject,
        template: params.template,
        status: params.status,
        provider: params.provider,
        providerMessageId: params.providerMessageId,
        errorMessage: params.errorMessage,
        entityType: params.entityType,
        entityId: params.entityId,
        sentAt: params.status === EmailStatus.sent ? new Date() : null,
        ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
      },
    })
  } catch (error) {
    console.error("Failed to log email attempt:", error)
  }
}

export async function hasRecentEmail(
  recipientEmail: string,
  template: string,
  entityId: string,
  withinHours: number = 24
) {
  const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000)

  const recentEmail = await prisma.emailLog.findFirst({
    where: {
      recipientEmail,
      template,
      entityId,
      status: EmailStatus.sent,
      createdAt: {
        gte: cutoff,
      },
    },
    select: {
      id: true,
    },
  })

  return Boolean(recentEmail)
}

function buildRoleBasedPath(entityType: string, entityId: string, role: Role | string) {
  const rolePrefix = role === Role.admin ? "admin" : role

  switch (entityType) {
    case "invoice":
      return `/${rolePrefix}/finance/invoices/${entityId}`
    case "report":
      return `/${rolePrefix}/reports/${entityId}`
    case "post":
      return `/${rolePrefix}/posts/${entityId}`
    default:
      return "/"
  }
}

export function getRoleBasedUrl(
  baseUrl: string,
  entityType: string,
  entityId: string,
  role: Role | string
) {
  const trimmedBaseUrl = baseUrl.replace(/\/+$/, "")
  return `${trimmedBaseUrl}${buildRoleBasedPath(entityType, entityId, role)}`
}

export function getRoleBasedPath(
  entityType: string,
  entityId: string,
  role: Role | string
) {
  return buildRoleBasedPath(entityType, entityId, role)
}

export function getAppBaseUrl() {
  return getConfiguredAppBaseUrl()
}
