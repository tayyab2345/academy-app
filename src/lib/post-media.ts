import path from "path"

const ALLOWED_POST_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
])

export const MAX_POST_IMAGE_SIZE = 4 * 1024 * 1024

function getSafePostImageExtension(originalFileName: string, mimeType: string) {
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

  const rawExtension = path.extname(originalFileName || "").toLowerCase()

  if (rawExtension === ".png") {
    return "png"
  }

  if (rawExtension === ".webp") {
    return "webp"
  }

  return "jpg"
}

export function isSupportedPostImageMimeType(mimeType: string) {
  return ALLOWED_POST_IMAGE_MIME_TYPES.has(mimeType.toLowerCase())
}

export function buildStoredPostImageFilename(input: {
  academyId: string
  userId: string
  originalFileName: string
  mimeType: string
}) {
  const extension = getSafePostImageExtension(
    input.originalFileName,
    input.mimeType
  )

  return `post_image__${input.academyId}__${input.userId}__${Date.now()}.${extension}`
}

export function parseStoredPostImageAccessInfo(fileName: string) {
  const withoutPrefix = fileName.replace(/^[a-f0-9]+_/i, "")
  const match = withoutPrefix.match(
    /^post_image__([^_]+)__([^_]+)__\d+\.(png|jpg|jpeg|webp)$/i
  )

  if (!match) {
    return null
  }

  return {
    academyId: match[1],
    userId: match[2],
  }
}
