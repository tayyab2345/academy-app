import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { getAdminCoursesPageData } from "@/lib/admin/admin-lists-data"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import {
  isSupportedStoredOrExternalImageUrl,
  isSupportedStoredOrExternalPdfUrl,
  normalizeOptionalMediaUrl,
} from "@/lib/media-url"
import { prisma } from "@/lib/prisma"
import { deleteStoredDocumentByUrl } from "@/lib/storage/document-storage"
import { z } from "zod"

const createCourseSchema = z.object({
  code: z.string().min(2, "Course code must be at least 2 characters"),
  name: z.string().min(2, "Course name must be at least 2 characters"),
  description: z.string().optional(),
  syllabusPdfUrl: z.string().trim().optional().nullable().or(z.literal("")),
  syllabusImageUrl: z.string().trim().optional().nullable().or(z.literal("")),
  gradeLevel: z.string().min(1, "Grade level is required"),
  subjectArea: z.string().min(2, "Subject area must be at least 2 characters"),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = parsePositiveInt(searchParams.get("page") || undefined, 1)
    const limit = parsePositiveInt(
      searchParams.get("limit") || undefined,
      DEFAULT_PAGE_SIZE,
      100
    )
    const search = searchParams.get("search") || ""
    const isActiveParam = searchParams.get("isActive")

    if (isActiveParam !== null) {
      const where: Prisma.CourseWhereInput = {
        academyId: session.user.academyId,
        isActive: isActiveParam === "true",
      }

      if (search) {
        where.OR = [
          { code: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { gradeLevel: { contains: search, mode: "insensitive" } },
          { subjectArea: { contains: search, mode: "insensitive" } },
        ]
      }

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          select: {
            id: true,
            code: true,
            name: true,
            gradeLevel: true,
            subjectArea: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                classes: true,
              },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.course.count({ where }),
      ])

      return NextResponse.json(
        {
          courses: courses.map((course) => ({
            ...course,
            createdAt: course.createdAt.toISOString(),
          })),
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
        {
          headers: getPrivateCacheHeaders(30),
        }
      )
    }

    const data = await getAdminCoursesPageData({
      academyId: session.user.academyId,
      page,
      limit,
      search,
    })

    return NextResponse.json(data, {
      headers: getPrivateCacheHeaders(30),
    })
  } catch (error) {
    console.error("Failed to fetch courses:", error)
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = createCourseSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const existingCourse = await prisma.course.findFirst({
      where: {
        academyId: session.user.academyId,
        code: validated.data.code,
      },
    })

    if (existingCourse) {
      return NextResponse.json(
        { error: "Course code already exists in this academy" },
        { status: 400 }
      )
    }

    const syllabusPdfUrl = normalizeOptionalMediaUrl(validated.data.syllabusPdfUrl)
    const syllabusImageUrl = normalizeOptionalMediaUrl(
      validated.data.syllabusImageUrl
    )

    if (!isSupportedStoredOrExternalPdfUrl(syllabusPdfUrl)) {
      return NextResponse.json(
        { error: "Invalid syllabus PDF URL" },
        { status: 400 }
      )
    }

    if (!isSupportedStoredOrExternalImageUrl(syllabusImageUrl)) {
      return NextResponse.json(
        { error: "Invalid syllabus image URL" },
        { status: 400 }
      )
    }

    const course = await prisma.course.create({
      data: {
        academyId: session.user.academyId,
        code: validated.data.code,
        name: validated.data.name,
        description: validated.data.description,
        syllabusPdfUrl,
        syllabusImageUrl,
        gradeLevel: validated.data.gradeLevel,
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

    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    console.error("Failed to create course:", error)
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    )
  }
}
