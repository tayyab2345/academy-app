import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAdminActiveClassOptions } from "@/lib/admin/admin-lists-data"
import { PostForm } from "@/components/posts/post-form"

export const metadata: Metadata = {
  title: "New Announcement - Admin - AcademyFlow",
  description: "Create a new academy announcement",
}

export default async function NewAdminPostPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const classOptions = await getAdminActiveClassOptions(session.user.academyId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Announcement</h2>
        <p className="text-muted-foreground">
          Create an academy-wide or class-specific announcement
        </p>
      </div>
      <PostForm
        classOptions={classOptions}
        redirectPath="/admin/posts"
      />
    </div>
  )
}
