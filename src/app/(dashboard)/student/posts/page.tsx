import { Role } from "@prisma/client"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getPostsPageData } from "@/lib/posts/post-page-data"
import { PostsPageContent } from "@/components/posts/posts-page-content"

interface StudentPostsPageProps {
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

export default async function StudentPostsPage({
  searchParams,
}: StudentPostsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/login")
  }

  const page = parsePositiveInt(getSingleSearchParam(searchParams?.page), 1)
  const limit = parsePositiveInt(getSingleSearchParam(searchParams?.limit), 10)

  const data = await getPostsPageData({
    userId: session.user.id,
    role: Role.student,
    academyId: session.user.academyId,
    page,
    limit,
    classId: "",
  })

  return (
    <PostsPageContent
      key={`${page}-${limit}`}
      heading="Announcements"
      description="Stay updated with class announcements"
      posts={data.posts}
      total={data.total}
      page={page}
      limit={limit}
      baseUrl="/student/posts"
      emptyMessage="No announcements yet."
    />
  )
}
