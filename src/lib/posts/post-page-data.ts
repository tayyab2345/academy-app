import { Role } from "@prisma/client"
import { getAdminActiveClassOptions } from "@/lib/admin/admin-lists-data"
import { getPostWhereForUser } from "@/lib/post-access"
import { prisma } from "@/lib/prisma"
import { getTeacherActiveClassOptions } from "@/lib/teacher/teacher-class-data"

export type PostFilterClassOption = {
  id: string
  name: string
  course: {
    code: string
    name: string
  }
}

export type PostPageListItem = {
  id: string
  title: string
  content: string
  imageUrl: string | null
  isPinned: boolean
  allowComments: boolean
  visibility: string
  createdAt: string
  author: {
    firstName: string
    lastName: string
    avatarUrl?: string | null
    role: string
  }
  class: PostFilterClassOption | null
  likedByCurrentUser: boolean
  viewedByCurrentUser: boolean
  _count: {
    comments: number
    reactions: number
    views: number
  }
}

export type PostsPageData = {
  posts: PostPageListItem[]
  total: number
  page: number
  totalPages: number
  availableClasses: PostFilterClassOption[]
}

export async function getPostsPageData(input: {
  userId: string
  role: Role
  academyId: string
  page: number
  limit: number
  classId: string
}): Promise<PostsPageData> {
  const where = await getPostWhereForUser(
    {
      userId: input.userId,
      role: input.role,
      academyId: input.academyId,
    },
    input.classId || undefined
  )

  const [posts, total, availableClasses] = await Promise.all([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        imageUrl: true,
        isPinned: true,
        allowComments: true,
        visibility: true,
        createdAt: true,
        author: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
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
            userId: input.userId,
          },
          select: {
            id: true,
          },
          take: 1,
        },
        views: {
          where: {
            userId: input.userId,
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
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.post.count({ where }),
    getPostFilterClassOptions(input),
  ])

  return {
    posts: posts.map((post) => {
      const { reactions, views, ...restPost } = post

      return {
        ...restPost,
        visibility: post.visibility,
        author: {
          ...post.author,
          role: post.author.role,
        },
        class: post.class,
        likedByCurrentUser: reactions.length > 0,
        viewedByCurrentUser: views.length > 0,
        createdAt: post.createdAt.toISOString(),
      }
    }),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
    availableClasses,
  }
}

async function getPostFilterClassOptions(input: {
  userId: string
  role: Role
  academyId: string
}) {
  if (input.role === Role.admin) {
    return getAdminActiveClassOptions(input.academyId)
  }

  if (input.role === Role.teacher) {
    return getTeacherActiveClassOptions(input.userId)
  }

  return []
}
