import { NextRequest, NextResponse } from "next/server"
import { Role } from "@prisma/client"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import {
  getPostWhereForUser,
} from "@/lib/post-access"
import {
  isSupportedStoredOrExternalImageUrl,
  normalizeOptionalMediaUrl,
} from "@/lib/media-url"
import { prisma } from "@/lib/prisma"
import { deleteStoredDocumentByUrl } from "@/lib/storage/document-storage"

export const dynamic = "force-dynamic"

const updatePostSchema = z.object({
  title: z.string().min(2).optional(),
  content: z.string().min(1).optional(),
  imageUrl: z.string().trim().optional().nullable().or(z.literal("")),
  allowComments: z.boolean().optional(),
  visibility: z.enum(["class_only", "parents_only", "students_only", "everyone"]).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const where = await getPostWhereForUser({
      userId: session.user.id,
      role: session.user.role as Role,
      academyId: session.user.academyId,
    })

    const post = await prisma.post.findFirst({
      where: {
        AND: [where, { id: params.postId }],
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
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
        reactions: {
          where: {
            userId: session.user.id,
          },
          select: {
            id: true,
          },
          take: 1,
        },
        views: {
          where: {
            userId: session.user.id,
          },
          select: {
            id: true,
          },
          take: 1,
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            views: true,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const { reactions, views, ...restPost } = post

    return NextResponse.json({
      post: {
        ...restPost,
        likedByCurrentUser: reactions.length > 0,
        viewedByCurrentUser: views.length > 0,
      },
    })
  } catch (error) {
    console.error("Failed to fetch post:", error)
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      include: {
        class: {
          select: {
            academyId: true,
          },
        },
        author: {
          select: {
            academyId: true,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const adminScoped =
      session.user.role === "admin" &&
      (post.class?.academyId === session.user.academyId ||
        (!post.classId && post.author.academyId === session.user.academyId))

    if (post.authorUserId !== session.user.id && !adminScoped) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const validated = updatePostSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    if (
      !post.classId &&
      validated.data.visibility === "class_only"
    ) {
      return NextResponse.json(
        { error: "Class-only announcements require a class" },
        { status: 400 }
      )
    }

    const nextImageUrl = normalizeOptionalMediaUrl(
      validated.data.imageUrl === undefined
        ? post.imageUrl
        : validated.data.imageUrl
    )

    if (!isSupportedStoredOrExternalImageUrl(nextImageUrl)) {
      return NextResponse.json(
        { error: "Invalid post image URL" },
        { status: 400 }
      )
    }

    const updatedPost = await prisma.post.update({
      where: { id: params.postId },
      data: {
        title: validated.data.title,
        content: validated.data.content,
        imageUrl:
          validated.data.imageUrl === undefined ? undefined : nextImageUrl,
        allowComments: validated.data.allowComments,
        visibility: validated.data.visibility,
      },
    })

    if (post.imageUrl && post.imageUrl !== updatedPost.imageUrl) {
      await deleteStoredDocumentByUrl(post.imageUrl)
    }

    return NextResponse.json({ post: updatedPost })
  } catch (error) {
    console.error("Failed to update post:", error)
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      include: {
        class: {
          select: {
            academyId: true,
          },
        },
        author: {
          select: {
            academyId: true,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const adminScoped =
      session.user.role === "admin" &&
      (post.class?.academyId === session.user.academyId ||
        (!post.classId && post.author.academyId === session.user.academyId))

    if (post.authorUserId !== session.user.id && !adminScoped) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.post.delete({
      where: { id: params.postId },
    })

    await deleteStoredDocumentByUrl(post.imageUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete post:", error)
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    )
  }
}
