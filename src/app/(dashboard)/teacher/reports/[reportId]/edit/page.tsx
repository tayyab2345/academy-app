import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { ReportForm } from "@/components/teacher/reports/report-form"

interface EditReportPageProps {
  params: {
    reportId: string
  }
}

async function fetchReport(reportId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    return null
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!teacherProfile) {
    return null
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      sections: {
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  })

  if (!report || report.teacherProfileId !== teacherProfile.id) {
    return null
  }

  if (report.status !== "draft") {
    return null
  }

  return report
}

export async function generateMetadata({
  params,
}: EditReportPageProps): Promise<Metadata> {
  const report = await fetchReport(params.reportId)

  if (!report) {
    return { title: "Report Not Found" }
  }

  return {
    title: "Edit Report - AcademyFlow",
  }
}

export default async function EditReportPage({
  params,
}: EditReportPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const report = await fetchReport(params.reportId)

  if (!report) {
    notFound()
  }

  const initialData = {
    id: report.id,
    classId: report.classId,
    studentProfileId: report.studentProfileId,
    reportType: report.reportType,
    reportDate: report.reportDate.toISOString().split("T")[0],
    periodStart: report.periodStart.toISOString().split("T")[0],
    periodEnd: report.periodEnd.toISOString().split("T")[0],
    status: report.status,
    sections: report.sections.map((section) => ({
      id: section.id,
      sectionType: section.sectionType,
      content: section.content || "",
      contentJson: section.contentJson,
      rating: section.rating,
      orderIndex: section.orderIndex,
    })),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/teacher/reports/${params.reportId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Report</h2>
          <p className="text-muted-foreground">
            Update report details and sections
          </p>
        </div>
      </div>

      <ReportForm initialData={initialData} isEditing />
    </div>
  )
}
