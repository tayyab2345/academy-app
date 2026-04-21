import path from "path"

export type CourseMediaKind = "pdf" | "image"

function normalizeCourseMediaExtension(
  kind: CourseMediaKind,
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

export function buildStoredCourseMediaFilename(input: {
  academyId: string
  kind: CourseMediaKind
  originalFileName: string
}) {
  const extension = normalizeCourseMediaExtension(
    input.kind,
    input.originalFileName
  )

  return `course_syllabus_${input.kind}__${input.academyId}__${Date.now()}${extension}`
}

export function parseStoredCourseMediaAccessInfo(fileName: string) {
  const match = fileName.match(/course_syllabus_(pdf|image)__([^_]+)__/i)

  if (!match) {
    return null
  }

  return {
    kind: match[1].toLowerCase() as CourseMediaKind,
    academyId: match[2],
  }
}
