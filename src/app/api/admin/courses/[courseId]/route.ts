import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  isSupportedStoredOrExternalImageUrl,
  isSupportedStoredOrExternalPdfUrl,
  normalizeOptionalMediaUrl,
} from "@/lib/media-url"
import { prisma } from "@/lib/prisma"
import { deleteStoredDocumentByUrl } from "@/lib/storage/document-storage"
import { z } from "zod"

const updateCourseSchema = z.object({
  code: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  syllabusPdfUrl: z.string().trim().optional().nullable().or(z.literal("")),
  syllabusImageUrl: z.string().trim().optional().nullable().or(z.literal("")),
  gradeLevel: z.string().trim().optional(),
  subjectArea: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        _count: {
          select: {
            classes: true,
          },
        },
      },
    })

    if (!course || course.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    return NextResponse.json({ course })
  } catch (error) {
    console.error("Failed to fetch course:", error)
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = updateCourseSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const existingCourse = await prisma.course.findUnique({
      where: { id: params.courseId },
    })

    if (!existingCourse || existingCourse.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    if (validated.data.code && validated.data.code !== existingCourse.code) {
      const duplicateCourse = await prisma.course.findFirst({
        where: {
          academyId: session.user.academyId,
          code: validated.data.code,
          id: { not: params.courseId },
        },
      })

      if (duplicateCourse) {
        return NextResponse.json(
          { error: "Course code already exists in this academy" },
          { status: 400 }
        )
      }
    }

    const nextSyllabusPdfUrl = normalizeOptionalMediaUrl(
      validated.data.syllabusPdfUrl === undefined
        ? existingCourse.syllabusPdfUrl
        : validated.data.syllabusPdfUrl
    )
    const nextSyllabusImageUrl = normalizeOptionalMediaUrl(
      validated.data.syllabusImageUrl === undefined
        ? existingCourse.syllabusImageUrl
        : validated.data.syllabusImageUrl
    )

    if (!isSupportedStoredOrExternalPdfUrl(nextSyllabusPdfUrl)) {
      return NextResponse.json(
        { error: "Invalid syllabus PDF URL" },
        { status: 400 }
      )
    }

    if (!isSupportedStoredOrExternalImageUrl(nextSyllabusImageUrl)) {
      return NextResponse.json(
        { error: "Invalid syllabus image URL" },
        { status: 400 }
      )
    }

    const course = await prisma.course.update({
      where: { id: params.courseId },
      data: {
        code: validated.data.code,
        name: validated.data.name,
        description:
          validated.data.description === undefined
            ? undefined
            : validated.data.description,
        syllabusPdfUrl:
          validated.data.syllabusPdfUrl === undefined
            ? undefined
            : nextSyllabusPdfUrl,
        syllabusImageUrl:
          validated.data.syllabusImageUrl === undefined
            ? undefined
            : nextSyllabusImageUrl,
        gradeLevel:
          validated.data.gradeLevel === undefined
            ? undefined
            : validated.data.gradeLevel,
        subjectArea: validated.data.subjectArea,
        isActive: validated.data.isActive,
      },
      include: {
        _count: {
          select: {
            classes: true,
          },
        },
      },
    })

    if (
      existingCourse.syllabusPdfUrl &&
      existingCourse.syllabusPdfUrl !== course.syllabusPdfUrl
    ) {
      await deleteStoredDocumentByUrl(existingCourse.syllabusPdfUrl)
    }

    if (
      existingCourse.syllabusImageUrl &&
      existingCourse.syllabusImageUrl !== course.syllabusImageUrl
    ) {
      await deleteStoredDocumentByUrl(existingCourse.syllabusImageUrl)
    }

    return NextResponse.json({ course })
  } catch (error) {
    console.error("Failed to update course:", error)
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        _count: {
          select: {
            classes: true,
          },
        },
      },
    })

    if (!course || course.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    if (course._count.classes > 0) {
      return NextResponse.json(
        { error: "Cannot delete a course that already has classes" },
        { status: 400 }
      )
    }

    await prisma.course.delete({
      where: { id: params.courseId },
    })

    await Promise.all([
      deleteStoredDocumentByUrl(course.syllabusPdfUrl),
      deleteStoredDocumentByUrl(course.syllabusImageUrl),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete course:", error)
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    )
  }
}
