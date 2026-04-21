import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const updateCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const comment = await prisma.comment.findUnique({
      where: { id: params.commentId },
      include: {
        post: {
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
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    const adminScoped =
      session.user.role === "admin" &&
      (comment.post.class?.academyId === session.user.academyId ||
        (!comment.post.classId &&
          comment.post.author.academyId === session.user.academyId))

    if (comment.authorUserId !== session.user.id && !adminScoped) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const validated = updateCommentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const updatedComment = await prisma.comment.update({
      where: { id: params.commentId },
      data: {
        content: validated.data.content,
        isEdited: true,
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

    return NextResponse.json({ comment: updatedComment })
  } catch (error) {
    console.error("Failed to update comment:", error)
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const comment = await prisma.comment.findUnique({
      where: { id: params.commentId },
      include: {
        post: {
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
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    const adminScoped =
      session.user.role === "admin" &&
      (comment.post.class?.academyId === session.user.academyId ||
        (!comment.post.classId &&
          comment.post.author.academyId === session.user.academyId))

    if (comment.authorUserId !== session.user.id && !adminScoped) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.comment.delete({
      where: { id: params.commentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete comment:", error)
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    )
  }
}
