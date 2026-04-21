import { NextRequest, NextResponse } from "next/server"
import { Role } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { canUserViewPost } from "@/lib/post-access"
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

    const existingReaction = await prisma.postReaction.findUnique({
      where: {
        postId_userId: {
          postId: params.postId,
          userId: session.user.id,
        },
      },
      select: {
        id: true,
      },
    })

    if (existingReaction) {
      await prisma.postReaction.delete({
        where: {
          id: existingReaction.id,
        },
      })
    } else {
      await prisma.postReaction.create({
        data: {
          postId: params.postId,
          userId: session.user.id,
          type: "like",
        },
      })
    }

    const likeCount = await prisma.postReaction.count({
      where: {
        postId: params.postId,
      },
    })

    return NextResponse.json({
      liked: !existingReaction,
      likeCount,
    })
  } catch (error) {
    console.error("Failed to toggle post like:", error)
    return NextResponse.json(
      { error: "Failed to update reaction" },
      { status: 500 }
    )
  }
}
