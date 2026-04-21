export function normalizeOptionalMediaUrl(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export function isSupportedStoredOrExternalImageUrl(
  value: string | null | undefined
) {
  if (!value) {
    return true
  }

  return (
    value.startsWith("/api/documents/") ||
    /^https?:\/\//i.test(value)
  )
}

export function isSupportedStoredOrExternalPdfUrl(
  value: string | null | undefined
) {
  if (!value) {
    return true
  }

  return (
    value.startsWith("/api/documents/") ||
    /^https?:\/\//i.test(value)
  )
}
