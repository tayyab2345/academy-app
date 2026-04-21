import { Role } from "@prisma/client"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getPostsPageData } from "@/lib/posts/post-page-data"
import { PostsPageContent } from "@/components/posts/posts-page-content"

interface ParentPostsPageProps {
  searchParams?: {
    page?: string | string[]
    limit?: string | string[]
  }
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max: number = 100
) {
  const parsed = Number.parseInt(value || "", 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.min(parsed, max)
}

export default async function ParentPostsPage({
  searchParams,
}: ParentPostsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "parent") {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 10)

  const data = await getPostsPageData({
    userId: session.user.id,
    role: Role.parent,
    academyId: session.user.academyId,
    page,
    limit,
    classId: "",
  })

  return (
    <PostsPageContent
      key={`${page}-${limit}`}
      heading="Announcements"
      description="Stay updated with announcements from your children's classes"
      posts={data.posts}
      total={data.total}
      page={page}
      limit={limit}
      baseUrl="/parent/posts"
      emptyMessage="No announcements yet."
    />
  )
}
