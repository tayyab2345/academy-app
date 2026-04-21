import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getTeacherActiveClassOptions } from "@/lib/teacher/teacher-class-data"
import { PostForm } from "@/components/posts/post-form"

export const metadata: Metadata = {
  title: "New Announcement - Teacher - AcademyFlow",
  description: "Create a new announcement",
}

export default async function NewTeacherPostPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const classOptions = await getTeacherActiveClassOptions(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Announcement</h2>
        <p className="text-muted-foreground">
          Share important updates with your classes
        </p>
      </div>
      <PostForm
        classOptions={classOptions}
        redirectPath="/teacher/posts"
      />
    </div>
  )
}
