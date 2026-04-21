import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StudentForm } from "@/components/admin/students/student-form"

interface EditStudentPageProps {
  params: {
    studentId: string
  }
}

async function fetchStudent(studentId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
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

  if (!student || student.user.academyId !== session.user.academyId) {
    return null
  }

  return student
}

export async function generateMetadata({
  params,
}: EditStudentPageProps): Promise<Metadata> {
  const student = await fetchStudent(params.studentId)

  if (!student) {
    return { title: "Student Not Found" }
  }

  return {
    title: `Edit ${student.user.firstName} ${student.user.lastName} - Students - AcademyFlow`,
  }
}

export default async function EditStudentPage({
  params,
}: EditStudentPageProps) {
  const student = await fetchStudent(params.studentId)

  if (!student) {
    notFound()
  }

  const initialData = {
    id: student.id,
    firstName: student.user.firstName,
    lastName: student.user.lastName,
    email: student.user.email,
    phone: student.user.phone || "",
    studentId: student.studentId,
    dateOfBirth: student.dateOfBirth.toISOString(),
    gradeLevel: student.gradeLevel,
    enrollmentDate: student.enrollmentDate.toISOString(),
    medicalNotes: student.medicalNotes || "",
    emergencyContactName: student.emergencyContactName,
    emergencyContactPhone: student.emergencyContactPhone,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/students/${params.studentId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Student</h2>
          <p className="text-muted-foreground">
            Update student information for {student.user.firstName}{" "}
            {student.user.lastName}
          </p>
        </div>
      </div>

      <StudentForm initialData={initialData} isEditing />
    </div>
  )
}
