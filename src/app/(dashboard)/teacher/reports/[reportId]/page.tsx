import { Metadata } from "next"
import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { ArrowLeft, Pencil, Archive } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { ReportPdfActions } from "@/components/reports/report-pdf-actions"
import { ReportViewer } from "@/components/reports/report-viewer"
import { ReportStatusBadge } from "@/components/reports/report-status-badge"

interface ReportDetailPageProps {
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
      studentProfile: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      class: {
        include: {
          course: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
      teacherProfile: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
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

  return report
}

export async function generateMetadata({
  params,
}: ReportDetailPageProps): Promise<Metadata> {
  const report = await fetchReport(params.reportId)

  if (!report) {
    return { title: "Report Not Found" }
  }

  return {
    title: `Report - ${report.studentProfile.user.firstName} ${report.studentProfile.user.lastName} - AcademyFlow`,
  }
}

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const report = await fetchReport(params.reportId)

  if (!report) {
    notFound()
  }

  const isDraft = report.status === "draft"
  const isPublished = report.status === "published"

  async function archiveReportAction() {
    "use server"

    const currentSession = await getServerSession(authOptions)

    if (!currentSession?.user || currentSession.user.role !== "teacher") {
      return
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: currentSession.user.id },
    })

    if (!teacherProfile) {
      return
    }

    const currentReport = await prisma.report.findUnique({
      where: { id: params.reportId },
      select: {
        id: true,
        teacherProfileId: true,
        status: true,
      },
    })

    if (
      !currentReport ||
      currentReport.teacherProfileId !== teacherProfile.id ||
      currentReport.status !== "published"
    ) {
      return
    }

    await prisma.report.update({
      where: { id: params.reportId },
      data: { status: "archived" },
    })

    revalidatePath("/teacher/reports")
    revalidatePath(`/teacher/reports/${params.reportId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teacher/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                Report Details
              </h2>
              <ReportStatusBadge status={report.status} />
            </div>
            <p className="text-muted-foreground">
              Created on {new Date(report.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <Link href={`/teacher/reports/${params.reportId}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          {isPublished && (
            <form action={archiveReportAction}>
              <Button variant="outline" type="submit">
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </form>
          )}
          <ReportPdfActions reportId={params.reportId} pdfUrl={report.pdfUrl} />
        </div>
      </div>

      <ReportViewer report={report} showActions={false} />
    </div>
  )
}
