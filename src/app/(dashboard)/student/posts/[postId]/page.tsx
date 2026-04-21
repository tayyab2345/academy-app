import { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { PostViewer } from "@/components/posts/post-viewer"
import { Button } from "@/components/ui/button"
import { fetchPostDetailForUser } from "@/lib/post-queries"

interface PostDetailPageProps {
  params: {
    postId: string
  }
}

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { title: "Post Not Found" }
  }

  const data = await fetchPostDetailForUser(
    {
      userId: session.user.id,
      role: session.user.role,
      academyId: session.user.academyId,
    },
    params.postId
  )

  if (!data) {
    return { title: "Post Not Found" }
  }

  return {
    title: `${data.post.title} - AcademyFlow`,
  }
}

export default async function StudentPostDetailPage({
  params,
}: PostDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/login")
  }

  const data = await fetchPostDetailForUser(
    {
      userId: session.user.id,
      role: session.user.role,
      academyId: session.user.academyId,
    },
    params.postId
  )

  if (!data) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/student/posts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Announcement</h2>
        </div>
      </div>

      <PostViewer
        post={data.post}
        comments={data.comments}
        currentUserId={session.user.id}
        currentUserRole="student"
        canManage={false}
      />
    </div>
  )
}
