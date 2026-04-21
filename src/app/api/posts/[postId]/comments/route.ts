import { NextRequest, NextResponse } from "next/server"
import { Role } from "@prisma/client"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { notifyCommentReply } from "@/lib/notification-service"
import { canUserViewPost } from "@/lib/post-access"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  parentCommentId: z.string().optional().nullable(),
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

    const canView = await canUserViewPost(
      {
        userId: session.user.id,
        role: session.user.role as Role,
        academyId: session.user.academyId,
      },
      params.postId
    )

    if (!canView) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const comments = await prisma.comment.findMany({
      where: {
        postId: params.postId,
        parentCommentId: null,
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
        replies: {
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
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("Failed to fetch comments:", error)
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    )
  }
}

export async function POST(
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
      select: {
        id: true,
        allowComments: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (!post.allowComments) {
      return NextResponse.json(
        { error: "Comments are disabled for this post" },
        { status: 403 }
      )
    }

    const canView = await canUserViewPost(
      {
        userId: session.user.id,
        role: session.user.role as Role,
        academyId: session.user.academyId,
      },
      params.postId
    )

    if (!canView) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const validated = createCommentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    if (validated.data.parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: validated.data.parentCommentId },
        select: {
          id: true,
          postId: true,
        },
      })

      if (!parentComment || parentComment.postId !== params.postId) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 400 }
        )
      }
    }

    const comment = await prisma.comment.create({
      data: {
        postId: params.postId,
        authorUserId: session.user.id,
        content: validated.data.content,
        parentCommentId: validated.data.parentCommentId || null,
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
      },
    })

    if (validated.data.parentCommentId) {
      try {
        await notifyCommentReply(comment.id)
      } catch (notificationError) {
        console.error("Failed to send comment reply notification:", notificationError)
      }
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error("Failed to create comment:", error)
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
}
