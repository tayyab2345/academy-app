import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { ReportPdfActions } from "@/components/reports/report-pdf-actions"
import { ReportStatusBadge } from "@/components/reports/report-status-badge"
import { ReportViewer } from "@/components/reports/report-viewer"

interface ReportDetailPageProps {
  params: {
    reportId: string
  }
}

async function fetchReport(reportId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  return prisma.report.findFirst({
    where: {
      id: reportId,
      class: {
        academyId: session.user.academyId,
      },
    },
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
}

export async function generateMetadata({
  params,
}: ReportDetailPageProps): Promise<Metadata> {
  const report = await fetchReport(params.reportId)

  if (!report) {
    return { title: "Report Not Found" }
  }

  return {
    title: `Report - ${report.studentProfile.user.firstName} ${report.studentProfile.user.lastName} - Admin`,
  }
}

export default async function AdminReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const report = await fetchReport(params.reportId)

  if (!report) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/reports">
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
              {report.publishedAt && (
                <>
                  {" "}
                  | Published {new Date(report.publishedAt).toLocaleDateString()}
                </>
              )}
            </p>
          </div>
        </div>
        <ReportPdfActions reportId={params.reportId} pdfUrl={report.pdfUrl} />
      </div>

      <ReportViewer report={report} showActions={false} />
    </div>
  )
}
