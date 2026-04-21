import { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { getAdminActiveClassOptions } from "@/lib/admin/admin-lists-data"
import { PostForm } from "@/components/posts/post-form"
import { Button } from "@/components/ui/button"
import { fetchEditablePostForAdmin } from "@/lib/post-queries"

interface EditPostPageProps {
  params: {
    postId: string
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Edit Announcement - Admin - AcademyFlow",
  }
}

export default async function EditAdminPostPage({
  params,
}: EditPostPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const post = await fetchEditablePostForAdmin(
    session.user.academyId,
    params.postId
  )
  const classOptions = await getAdminActiveClassOptions(session.user.academyId)

  if (!post) {
    notFound()
  }

  const initialData = {
    id: post.id,
    classId: post.classId,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl,
    isPinned: post.isPinned,
    allowComments: post.allowComments,
    visibility: post.visibility,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/posts/${params.postId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Announcement</h2>
          <p className="text-muted-foreground">Update this announcement</p>
        </div>
      </div>

      <PostForm
        initialData={initialData}
        isEditing
        classOptions={classOptions}
        redirectPath="/admin/posts"
      />
    </div>
  )
}
