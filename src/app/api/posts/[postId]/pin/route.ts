import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(
  _req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

    if (session.user.role === "admin") {
      const adminScoped =
        post.class?.academyId === session.user.academyId ||
        (!post.classId && post.author.academyId === session.user.academyId)

      if (!adminScoped) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (post.authorUserId !== session.user.id) {
      if (!post.classId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

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
            classId: post.classId,
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

    const updatedPost = await prisma.post.update({
      where: { id: params.postId },
      data: { isPinned: true },
    })

    return NextResponse.json({ post: updatedPost })
  } catch (error) {
    console.error("Failed to pin post:", error)
    return NextResponse.json(
      { error: "Failed to pin post" },
      { status: 500 }
    )
  }
}
