import { Prisma } from "@prisma/client"
import { PostAccessUser, getAcademyScopedPostWhere, getPostWhereForUser } from "@/lib/post-access"
import { prisma } from "@/lib/prisma"

function getPostDetailInclude(userId: string) {
  return {
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
        userId,
      },
      select: {
        id: true,
      },
      take: 1,
    },
    views: {
      where: {
        userId,
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
  } satisfies Prisma.PostInclude
}

const commentThreadInclude = {
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
} satisfies Prisma.CommentInclude

export async function fetchPostDetailForUser(
  user: PostAccessUser,
  postId: string
) {
  const where = await getPostWhereForUser(user)

  const post = await prisma.post.findFirst({
    where: {
      AND: [where, { id: postId }],
    },
    include: getPostDetailInclude(user.userId),
  })

  if (!post) {
    return null
  }

  const comments = await prisma.comment.findMany({
    where: {
      postId,
      parentCommentId: null,
    },
    include: commentThreadInclude,
    orderBy: {
      createdAt: "desc",
    },
  })

  const { reactions, views, ...restPost } = post

  return {
    post: {
      ...restPost,
      likedByCurrentUser: reactions.length > 0,
      viewedByCurrentUser: views.length > 0,
    },
    comments,
  }
}

export async function fetchEditablePostForTeacher(
  userId: string,
  postId: string
) {
  return prisma.post.findFirst({
    where: {
      id: postId,
      authorUserId: userId,
    },
  })
}

export async function fetchEditablePostForAdmin(
  academyId: string,
  postId: string
) {
  return prisma.post.findFirst({
    where: {
      AND: [getAcademyScopedPostWhere(academyId), { id: postId }],
    },
  })
}
