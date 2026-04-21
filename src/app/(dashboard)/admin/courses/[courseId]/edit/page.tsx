import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CourseForm } from "@/components/admin/courses/course-form"

interface EditCoursePageProps {
  params: {
    courseId: string
  }
}

async function fetchCourse(courseId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  })

  if (!course || course.academyId !== session.user.academyId) {
    return null
  }

  return course
}

export async function generateMetadata({
  params,
}: EditCoursePageProps): Promise<Metadata> {
  const course = await fetchCourse(params.courseId)

  if (!course) {
    return { title: "Course Not Found" }
  }

  return {
    title: `Edit ${course.name} - Courses - AcademyFlow`,
  }
}

export default async function EditCoursePage({
  params,
}: EditCoursePageProps) {
  const course = await fetchCourse(params.courseId)

  if (!course) {
    notFound()
  }

  const initialData = {
    id: course.id,
    code: course.code,
    name: course.name,
    description: course.description || "",
    syllabusPdfUrl: course.syllabusPdfUrl,
    syllabusImageUrl: course.syllabusImageUrl,
    gradeLevel: course.gradeLevel,
    subjectArea: course.subjectArea,
    isActive: course.isActive,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/courses/${params.courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Course</h2>
          <p className="text-muted-foreground">
            Update course information for {course.name}
          </p>
        </div>
      </div>

      <CourseForm initialData={initialData} isEditing />
    </div>
  )
}
