import { Metadata } from "next"
import { ParentForm } from "@/components/admin/parents/parent-form"

export const metadata: Metadata = {
  title: "Add Parent - AcademyFlow",
  description: "Create a new parent account",
}

export default function NewParentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add New Parent</h2>
        <p className="text-muted-foreground">
          Create a parent/guardian account
        </p>
      </div>

      <ParentForm />
    </div>
  )
}
