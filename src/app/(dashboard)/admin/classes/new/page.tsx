import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
  getAdminCourseOptions,
  getAdminTeacherAssignmentOptions,
} from "@/lib/admin/admin-lists-data"
import { ClassForm } from "@/components/admin/classes/class-form"

export const metadata: Metadata = {
  title: "Create Class - AcademyFlow",
  description: "Create a new class",
}

interface NewClassPageProps {
  searchParams: {
    courseId?: string
  }
}

export default async function NewClassPage({ searchParams }: NewClassPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const initialData = searchParams.courseId
    ? { courseId: searchParams.courseId }
    : undefined
  const [courses, teacherOptions] = await Promise.all([
    getAdminCourseOptions(session.user.academyId, false),
    getAdminTeacherAssignmentOptions(session.user.academyId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create New Class</h2>
        <p className="text-muted-foreground">
          Create a class based on an existing course
        </p>
      </div>
      <ClassForm
        initialData={initialData}
        courses={courses}
        teacherOptions={teacherOptions}
      />
    </div>
  )
}
