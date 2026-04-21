import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { ReportPdfActions } from "@/components/reports/report-pdf-actions"
import { ReportViewer } from "@/components/reports/report-viewer"

interface ReportDetailPageProps {
  params: {
    reportId: string
  }
}

async function fetchReport(reportId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "parent") {
    return null
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!parentProfile) {
    return null
  }

  const links = await prisma.parentStudentLink.findMany({
    where: { parentProfileId: parentProfile.id },
    select: { studentProfileId: true },
  })

  const studentIds = links.map((link) => link.studentProfileId)

  return prisma.report.findFirst({
    where: {
      id: reportId,
      studentProfileId: { in: studentIds },
      status: "published",
    },
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
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
    title: `Report - ${report.studentProfile.user.firstName} ${report.studentProfile.user.lastName} - AcademyFlow`,
  }
}

export default async function ParentReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "parent") {
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
          <Link href="/parent/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Report: {report.studentProfile.user.firstName}{" "}
              {report.studentProfile.user.lastName}
            </h2>
            <p className="text-muted-foreground">
              Published on{" "}
              {report.publishedAt
                ? new Date(report.publishedAt).toLocaleDateString()
                : new Date(report.reportDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <ReportPdfActions reportId={params.reportId} pdfUrl={report.pdfUrl} />
      </div>

      <ReportViewer report={report} showActions={false} />
    </div>
  )
}
