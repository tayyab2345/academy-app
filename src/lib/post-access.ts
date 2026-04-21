import { PostVisibility, Prisma, Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export interface PostAccessUser {
  userId: string
  role: Role
  academyId: string
}

const STUDENT_CLASS_VISIBILITIES: PostVisibility[] = [
  PostVisibility.class_only,
  PostVisibility.students_only,
  PostVisibility.everyone,
]

const PARENT_CLASS_VISIBILITIES: PostVisibility[] = [
  PostVisibility.class_only,
  PostVisibility.parents_only,
  PostVisibility.everyone,
]

const STUDENT_ACADEMY_VISIBILITIES: PostVisibility[] = [
  PostVisibility.students_only,
  PostVisibility.everyone,
]

const PARENT_ACADEMY_VISIBILITIES: PostVisibility[] = [
  PostVisibility.parents_only,
  PostVisibility.everyone,
]

export function getAcademyScopedPostWhere(academyId: string): Prisma.PostWhereInput {
  return {
    OR: [
      {
        class: {
          academyId,
        },
      },
      {
        classId: null,
        author: {
          academyId,
        },
      },
    ],
  }
}

export async function getPostWhereForUser(
  user: PostAccessUser,
  classId?: string
): Promise<Prisma.PostWhereInput> {
  let scope: Prisma.PostWhereInput

  if (user.role === Role.admin) {
    scope = getAcademyScopedPostWhere(user.academyId)
  } else if (user.role === Role.teacher) {
    scope = {
      OR: [
        {
          class: {
            teachers: {
              some: {
                teacherProfile: {
                  userId: user.userId,
                },
              },
            },
          },
        },
        {
          authorUserId: user.userId,
          author: {
            academyId: user.academyId,
          },
        },
        {
          classId: null,
          author: {
            academyId: user.academyId,
          },
          visibility: PostVisibility.everyone,
        },
      ],
    }
  } else if (user.role === Role.student) {
    scope = {
      OR: [
        {
          class: {
            enrollments: {
              some: {
                status: "active",
                studentProfile: {
                  userId: user.userId,
                },
              },
            },
          },
          visibility: { in: STUDENT_CLASS_VISIBILITIES },
        },
        {
          classId: null,
          author: {
            academyId: user.academyId,
          },
          visibility: { in: STUDENT_ACADEMY_VISIBILITIES },
        },
      ],
    }
  } else {
    scope = {
      OR: [
        {
          class: {
            enrollments: {
              some: {
                status: "active",
                studentProfile: {
                  parentLinks: {
                    some: {
                      parentProfile: {
                        userId: user.userId,
                      },
                    },
                  },
                },
              },
            },
          },
          visibility: { in: PARENT_CLASS_VISIBILITIES },
        },
        {
          classId: null,
          author: {
            academyId: user.academyId,
          },
          visibility: { in: PARENT_ACADEMY_VISIBILITIES },
        },
      ],
    }
  }

  if (!classId) {
    return scope
  }

  return {
    AND: [scope, { classId }],
  }
}

export async function canUserViewPost(
  user: PostAccessUser,
  postId: string
): Promise<boolean> {
  const scope = await getPostWhereForUser(user)

  const post = await prisma.post.findFirst({
    where: {
      AND: [scope, { id: postId }],
    },
    select: { id: true },
  })

  return Boolean(post)
}

export function getPostActionUrlForRole(
  role: Role,
  postId: string,
  commentId?: string
) {
  const baseUrl = `/${role}/posts/${postId}`
  return commentId ? `${baseUrl}#comment-${commentId}` : baseUrl
}
