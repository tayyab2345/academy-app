import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { ExamForm } from "@/components/results/exam-form"
import { getManageableResultClassOptions } from "@/lib/results/result-data"

export default async function AdminNewResultPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const classOptions = await getManageableResultClassOptions({
    academyId: session.user.academyId,
    role: session.user.role,
    userId: session.user.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Exam</h2>
        <p className="text-muted-foreground">
          Create a new test or exam before entering marks.
        </p>
      </div>
      <ExamForm
        classOptions={classOptions}
        backHref="/admin/results"
        successHref="/admin/results/:id"
      />
    </div>
  )
}
