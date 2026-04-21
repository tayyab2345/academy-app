export const ACADEMY_DELETE_CONFIRMATION_TEXT = "DELETE MY ACADEMY"

const DEFAULT_RECOVERY_WINDOW_DAYS = 14

export const ACADEMY_RECOVERY_WINDOW_DAYS = Number.isFinite(
  Number(process.env.ACADEMY_RECOVERY_WINDOW_DAYS)
)
  ? Math.max(1, Number(process.env.ACADEMY_RECOVERY_WINDOW_DAYS))
  : DEFAULT_RECOVERY_WINDOW_DAYS

function parseSafeDate(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  const safeDate = new Date(value)
  return Number.isNaN(safeDate.getTime()) ? null : safeDate
}

export function getAcademyRecoveryDeadline(deletedAt: Date | string) {
  const safeDeletedAt = parseSafeDate(deletedAt)

  if (!safeDeletedAt) {
    return null
  }

  return new Date(
    safeDeletedAt.getTime() +
      ACADEMY_RECOVERY_WINDOW_DAYS * 24 * 60 * 60 * 1000
  )
}

export function isAcademyWithinRecoveryWindow(
  deletedAt: Date | string | null | undefined,
  now: Date = new Date()
) {
  if (!deletedAt) {
    return false
  }

  const deadline = getAcademyRecoveryDeadline(deletedAt)
  if (!deadline) {
    return false
  }

  return deadline.getTime() >= now.getTime()
}

export function formatRecoveryDeadline(deletedAt: Date | string | null | undefined) {
  if (!deletedAt) {
    return null
  }

  const deadline = getAcademyRecoveryDeadline(deletedAt)
  return deadline ? deadline.toISOString() : null
}

export function getRecoveryDaysRemaining(
  deletedAt: Date | string | null | undefined,
  now: Date = new Date()
) {
  const deadline = deletedAt ? getAcademyRecoveryDeadline(deletedAt) : null

  if (!deadline) {
    return 0
  }

  const diffMs = deadline.getTime() - now.getTime()
  if (diffMs <= 0) {
    return 0
  }

  return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}
