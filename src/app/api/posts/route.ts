import { NextRequest, NextResponse } from "next/server"
import { PostVisibility, Role } from "@prisma/client"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import {
  isSupportedStoredOrExternalImageUrl,
  normalizeOptionalMediaUrl,
} from "@/lib/media-url"
import { notifyPostPublished } from "@/lib/notification-service"
import { getPostsPageData } from "@/lib/posts/post-page-data"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const createPostSchema = z.object({
  classId: z.string().optional().nullable(),
  title: z.string().min(2, "Title must be at least 2 characters"),
  content: z.string().min(1, "Content is required"),
  imageUrl: z.string().trim().optional().nullable().or(z.literal("")),
  isPinned: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  visibility: z.enum(["class_only", "parents_only", "students_only", "everyone"]),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.max(1, Number.parseInt(searchParams.get("limit") || "10", 10))
    const classId = searchParams.get("classId") || undefined

    const data = await getPostsPageData({
      userId: session.user.id,
      role: session.user.role as Role,
      academyId: session.user.academyId,
      page,
      limit,
      classId: classId || "",
    })

    return NextResponse.json(
      {
        posts: data.posts,
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
      },
      {
        headers: getPrivateCacheHeaders(30),
      }
    )
  } catch (error) {
    console.error("Failed to fetch posts:", error)
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const validated = createPostSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    if (
      !validated.data.classId &&
      validated.data.visibility === PostVisibility.class_only
    ) {
      return NextResponse.json(
        { error: "Class-only announcements require a class" },
        { status: 400 }
      )
    }

    if (validated.data.classId) {
      const classData = await prisma.class.findUnique({
        where: { id: validated.data.classId },
        select: {
          id: true,
          academyId: true,
        },
      })

      if (!classData) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 })
      }

      if (session.user.role === "admin") {
        if (classData.academyId !== session.user.academyId) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }
      } else {
        const teacherProfile = await prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        })

        if (!teacherProfile) {
          return NextResponse.json(
            { error: "Teacher profile not found" },
            { status: 403 }
          )
        }

        const classTeacher = await prisma.classTeacher.findUnique({
          where: {
            classId_teacherProfileId: {
              classId: validated.data.classId,
              teacherProfileId: teacherProfile.id,
            },
          },
          select: { id: true },
        })

        if (!classTeacher) {
          return NextResponse.json(
            { error: "You are not assigned to this class" },
            { status: 403 }
          )
        }
      }
    }

    const imageUrl = normalizeOptionalMediaUrl(validated.data.imageUrl)

    if (!isSupportedStoredOrExternalImageUrl(imageUrl)) {
      return NextResponse.json(
        { error: "Invalid post image URL" },
        { status: 400 }
      )
    }

    const post = await prisma.post.create({
      data: {
        classId: validated.data.classId || null,
        authorUserId: session.user.id,
        title: validated.data.title,
        content: validated.data.content,
        imageUrl,
        isPinned: validated.data.isPinned,
        allowComments: validated.data.allowComments,
        visibility: validated.data.visibility,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            academyId: true,
            role: true,
          },
        },
        class: {
          include: {
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    })

    try {
      await notifyPostPublished(post.id)
    } catch (notificationError) {
      console.error("Failed to send post notifications:", notificationError)
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error("Failed to create post:", error)
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    )
  }
}
