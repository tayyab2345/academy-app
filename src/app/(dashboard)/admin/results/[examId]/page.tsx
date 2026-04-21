import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { ExamDetailManager } from "@/components/results/exam-detail-manager"
import { ExamForm } from "@/components/results/exam-form"
import { ExamTypeBadge } from "@/components/results/exam-type-badge"
import { getExamDetailPageData } from "@/lib/results/result-data"
import { Button } from "@/components/ui/button"

interface AdminResultDetailPageProps {
  params: {
    examId: string
  }
}

export default async function AdminResultDetailPage({
  params,
}: AdminResultDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const data = await getExamDetailPageData({
    academyId: session.user.academyId,
    userId: session.user.id,
    role: session.user.role,
    examId: params.examId,
  })

  if (!data) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/results">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{data.exam.name}</h2>
              <ExamTypeBadge type={data.exam.type} />
            </div>
            <p className="text-muted-foreground">
              {data.exam.class.course.code}: {data.exam.class.name}
              {data.exam.class.section ? ` (Section ${data.exam.class.section})` : ""} •{" "}
              {new Date(data.exam.examDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <ExamForm
        classOptions={[
          {
            id: data.exam.class.id,
            name: data.exam.class.name,
            section: data.exam.class.section,
            course: data.exam.class.course,
          },
        ]}
        initialData={{
          id: data.exam.id,
          classId: data.exam.class.id,
          name: data.exam.name,
          type: data.exam.type,
          examDate: data.exam.examDate.slice(0, 10),
          totalMarks: data.exam.totalMarks,
          notes: data.exam.notes || "",
        }}
        isEditing
        backHref="/admin/results"
        successHref={`/admin/results/${data.exam.id}`}
      />

      <ExamDetailManager
        examId={data.exam.id}
        totalMarks={data.exam.totalMarks}
        students={data.students}
        resultFiles={data.resultFiles}
        summary={data.summary}
      />
    </div>
  )
}
