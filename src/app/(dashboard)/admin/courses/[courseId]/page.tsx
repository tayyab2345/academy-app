import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, Pencil, BookOpen, Users, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CourseSyllabusPanel } from "@/components/courses/course-syllabus-panel"

interface CourseDetailPageProps {
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
    include: {
      classes: {
        include: {
          _count: {
            select: {
              enrollments: {
                where: { status: "active" },
              },
              teachers: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  if (!course || course.academyId !== session.user.academyId) {
    return null
  }

  return course
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const course = await fetchCourse(params.courseId)

  if (!course) {
    return { title: "Course Not Found" }
  }

  return {
    title: `${course.name} - Courses - AcademyFlow`,
  }
}

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const course = await fetchCourse(params.courseId)

  if (!course) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Course Details
            </h2>
            <p className="text-muted-foreground">
              View course information and associated classes
            </p>
          </div>
        </div>
        <Link href={`/admin/courses/${params.courseId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Course
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Course Code</p>
                <p className="text-lg font-mono">{course.code}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Course Name</p>
                <p className="text-lg font-semibold">{course.name}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Grade Level</p>
                  <p>{course.gradeLevel || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subject Area</p>
                  <p>{course.subjectArea}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={course.isActive ? "success" : "secondary"} className="mt-1">
                  {course.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {course.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {course.description}
                </p>
              </CardContent>
            </Card>
          )}

          <CourseSyllabusPanel
            courseName={course.name}
            syllabusPdfUrl={course.syllabusPdfUrl}
            syllabusImageUrl={course.syllabusImageUrl}
            emptyMessage="No syllabus uploaded for this course yet."
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Classes
                </CardTitle>
                <CardDescription>
                  Classes created from this course
                </CardDescription>
              </div>
              <Link href={`/admin/classes/new?courseId=${course.id}`}>
                <Button size="sm">Create Class</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {course.classes.length === 0 ? (
                <div className="py-8 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No classes created for this course yet
                  </p>
                  <Link href={`/admin/classes/new?courseId=${course.id}`}>
                    <Button variant="outline" className="mt-4">
                      Create First Class
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {course.classes.map((cls) => (
                    <Link
                      key={cls.id}
                      href={`/admin/classes/${cls.id}`}
                      className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          {cls.section && (
                            <p className="text-sm text-muted-foreground">Section {cls.section}</p>
                          )}
                          <p className="mt-1 text-sm text-muted-foreground">
                            {cls.academicYear || "Academic year not set"}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {cls._count.enrollments}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {cls.startDate
                              ? new Date(cls.startDate).toLocaleDateString()
                              : "Date not set"}
                          </span>
                          <Badge variant={cls.status === "active" ? "success" : "secondary"}>
                            {cls.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
