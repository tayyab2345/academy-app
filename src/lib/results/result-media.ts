import path from "path"

export type ResultUploadKind = "pdf" | "image"

function normalizeResultFileExtension(
  kind: ResultUploadKind,
  originalFileName: string
) {
  const rawExtension = path.extname(originalFileName || "").toLowerCase()

  if (kind === "pdf") {
    return rawExtension === ".pdf" ? rawExtension : ".pdf"
  }

  if (rawExtension === ".jpg" || rawExtension === ".jpeg") {
    return ".jpg"
  }

  if (rawExtension === ".webp") {
    return ".webp"
  }

  return ".png"
}

export function buildStoredResultFileFilename(input: {
  academyId: string
  userId: string
  kind: ResultUploadKind
  originalFileName: string
}) {
  const extension = normalizeResultFileExtension(
    input.kind,
    input.originalFileName
  )

  return `result_file_${input.kind}__${input.academyId}__${input.userId}__${Date.now()}${extension}`
}

export function parseStoredResultFileAccessInfo(fileName: string) {
  const match = fileName.match(/result_file_(pdf|image)__([^_]+)__([^_]+)__/i)

  if (!match) {
    return null
  }

  return {
    kind: match[1].toLowerCase() as ResultUploadKind,
    academyId: match[2],
    userId: match[3],
  }
}
