import { Metadata } from "next"
import { StudentForm } from "@/components/admin/students/student-form"

export const metadata: Metadata = {
  title: "Add Student - AcademyFlow",
  description: "Create a new student account",
}

export default function NewStudentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add New Student</h2>
        <p className="text-muted-foreground">
          Create a student account and enrollment profile
        </p>
      </div>

      <StudentForm />
    </div>
  )
}
