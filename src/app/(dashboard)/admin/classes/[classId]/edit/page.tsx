import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getAdminCourseOptions,
  getAdminStudentAssignmentOptions,
  getAdminTeacherAssignmentOptions,
} from "@/lib/admin/admin-lists-data"
import { prisma } from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ClassForm } from "@/components/admin/classes/class-form"

interface EditClassPageProps {
  params: {
    classId: string
  }
}

async function fetchClass(classId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      teachers: {
        select: {
          teacherProfileId: true,
          role: true,
        },
        orderBy: {
          role: "asc",
        },
      },
      enrollments: {
        where: {
          status: "active",
        },
        select: {
          studentProfileId: true,
        },
      },
    },
  })

  if (!classData || classData.academyId !== session.user.academyId) {
    return null
  }

  return classData
}

export async function generateMetadata({
  params,
}: EditClassPageProps): Promise<Metadata> {
  const classData = await fetchClass(params.classId)

  if (!classData) {
    return { title: "Class Not Found" }
  }

  return {
    title: `Edit ${classData.name} - Classes - AcademyFlow`,
  }
}

export default async function EditClassPage({
  params,
}: EditClassPageProps) {
  const classData = await fetchClass(params.classId)
  const session = await getServerSession(authOptions)

  if (!classData || !session?.user || session.user.role !== "admin") {
    notFound()
  }

  const primaryTeacherAssignment =
    classData.teachers.find((assignment) => assignment.role === "primary") ||
    classData.teachers[0] ||
    null

  const [courses, teacherOptions, studentOptions] = await Promise.all([
    getAdminCourseOptions(session.user.academyId, true),
    getAdminTeacherAssignmentOptions(
      session.user.academyId,
      primaryTeacherAssignment ? [primaryTeacherAssignment.teacherProfileId] : []
    ),
    getAdminStudentAssignmentOptions(
      session.user.academyId,
      classData.enrollments.map((enrollment) => enrollment.studentProfileId)
    ),
  ])

  const initialData = {
    id: classData.id,
    courseId: classData.courseId,
    name: classData.name,
    section: classData.section || "",
    academicYear: classData.academicYear || "",
    startDate: classData.startDate?.toISOString() || "",
    endDate: classData.endDate?.toISOString() || "",
    teacherProfileId: primaryTeacherAssignment?.teacherProfileId || "",
    scheduleDays: classData.scheduleDays,
    scheduleStartTime: classData.scheduleStartTime || "",
    scheduleEndTime: classData.scheduleEndTime || "",
    defaultMeetingPlatform: classData.defaultMeetingPlatform,
    defaultMeetingLink: classData.defaultMeetingLink || "",
    lateThresholdMinutes: classData.lateThresholdMinutes,
    studentProfileIds: classData.enrollments.map(
      (enrollment) => enrollment.studentProfileId
    ),
    status: classData.status,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/classes/${params.classId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Class</h2>
          <p className="text-muted-foreground">
            Update class information for {classData.name}
          </p>
        </div>
      </div>

      <ClassForm
        initialData={initialData}
        isEditing
        courses={courses}
        teacherOptions={teacherOptions}
        studentOptions={studentOptions}
      />
    </div>
  )
}
