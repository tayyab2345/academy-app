import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TeacherForm } from "@/components/admin/teachers/teacher-form"

interface EditTeacherPageProps {
  params: {
    teacherId: string
  }
}

export async function generateMetadata({
  params,
}: EditTeacherPageProps): Promise<Metadata> {
  const teacher = await fetchTeacher(params.teacherId)

  if (!teacher) {
    return {
      title: "Teacher Not Found",
    }
  }

  return {
    title: `Edit ${teacher.user.firstName} ${teacher.user.lastName} - Teachers - AcademyFlow`,
    description: "Edit teacher information",
  }
}

async function fetchTeacher(teacherId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      user: {
        select: {
          id: true,
          academyId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
        },
      },
    },
  })

  if (!teacher || teacher.user.academyId !== session.user.academyId) {
    return null
  }

  return teacher
}

export default async function EditTeacherPage({
  params,
}: EditTeacherPageProps) {
  const teacher = await fetchTeacher(params.teacherId)

  if (!teacher) {
    notFound()
  }

  const initialData = {
    id: teacher.id,
    firstName: teacher.user.firstName,
    lastName: teacher.user.lastName,
    email: teacher.user.email,
    phone: teacher.user.phone || "",
    employeeId: teacher.employeeId || "",
    qualification: teacher.qualification || "",
    specialization: teacher.specialization || "",
    bio: teacher.bio || "",
    maxWeeklyHours: teacher.maxWeeklyHours || undefined,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/teachers/${params.teacherId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Edit Teacher
          </h2>
          <p className="text-muted-foreground">
            Update teacher information for {teacher.user.firstName} {teacher.user.lastName}
          </p>
        </div>
      </div>

      <TeacherForm initialData={initialData} isEditing />
    </div>
  )
}
