import { Metadata } from "next"
import { CourseForm } from "@/components/admin/courses/course-form"

export const metadata: Metadata = {
  title: "Add Course - AcademyFlow",
  description: "Create a new course",
}

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add New Course</h2>
        <p className="text-muted-foreground">
          Create a new course for your academy catalog
        </p>
      </div>

      <CourseForm />
    </div>
  )
}
