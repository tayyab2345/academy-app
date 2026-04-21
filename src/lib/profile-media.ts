const ALLOWED_PROFILE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
])

export const MAX_PROFILE_IMAGE_SIZE = 4 * 1024 * 1024

type BrandingAccessInfo =
  | {
      kind: "user_avatar"
      academyId: string
      userId: string
    }
  | {
      kind: "academy_logo"
      academyId: string
    }

function getSafeImageExtension(fileName: string, mimeType: string) {
  const normalizedMimeType = mimeType.toLowerCase()

  if (normalizedMimeType === "image/png") {
    return "png"
  }

  if (normalizedMimeType === "image/webp") {
    return "webp"
  }

  if (
    normalizedMimeType === "image/jpg" ||
    normalizedMimeType === "image/jpeg"
  ) {
    return "jpg"
  }

  const rawExtension = fileName.split(".").pop()?.toLowerCase()

  if (rawExtension === "png" || rawExtension === "webp") {
    return rawExtension
  }

  return "jpg"
}

export function isSupportedProfileImageMimeType(mimeType: string) {
  return ALLOWED_PROFILE_IMAGE_MIME_TYPES.has(mimeType.toLowerCase())
}

export function buildStoredUserAvatarFilename(
  originalFileName: string,
  academyId: string,
  userId: string,
  mimeType: string
) {
  const extension = getSafeImageExtension(originalFileName, mimeType)
  return `user_avatar__${academyId}__${userId}__${Date.now()}.${extension}`
}

export function buildStoredAcademyLogoFilename(
  originalFileName: string,
  academyId: string,
  mimeType: string
) {
  const extension = getSafeImageExtension(originalFileName, mimeType)
  return `academy_logo__${academyId}__${Date.now()}.${extension}`
}

export function parseStoredBrandingAccessInfo(
  fileName: string
): BrandingAccessInfo | null {
  const withoutPrefix = fileName.replace(/^[a-f0-9]+_/i, "")

  const userAvatarMatch = withoutPrefix.match(
    /^user_avatar__([^_]+)__([^_]+)__\d+\.(png|jpg|jpeg|webp)$/i
  )

  if (userAvatarMatch) {
    return {
      kind: "user_avatar",
      academyId: userAvatarMatch[1],
      userId: userAvatarMatch[2],
    }
  }

  const academyLogoMatch = withoutPrefix.match(
    /^academy_logo__([^_]+)__\d+\.(png|jpg|jpeg|webp)$/i
  )

  if (academyLogoMatch) {
    return {
      kind: "academy_logo",
      academyId: academyLogoMatch[1],
    }
  }

  return null
}
