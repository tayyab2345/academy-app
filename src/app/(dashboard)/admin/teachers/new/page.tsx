import { Metadata } from "next"
import { TeacherForm } from "@/components/admin/teachers/teacher-form"

export const metadata: Metadata = {
  title: "Add Teacher - AcademyFlow",
  description: "Create a new teacher account",
}

export default function NewTeacherPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add New Teacher</h2>
        <p className="text-muted-foreground">
          Create a teacher account and profile
        </p>
      </div>

      <TeacherForm />
    </div>
  )
}
