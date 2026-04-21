"use client"

import Link from "next/link"
import type { ReportStatus, ReportType } from "@prisma/client"
import { Calendar, User, BookOpen } from "lucide-react"
import { ReportStatusBadge } from "./report-status-badge"

export interface ReportListItem {
  id: string
  reportType: ReportType
  reportDate: string | Date
  status: ReportStatus
  publishedAt: string | Date | null
  studentProfile?: {
    studentId: string
    user: {
      firstName: string
      lastName: string
    }
  }
  class: {
    name: string
    course: {
      code: string
      name: string
    }
  }
  teacherProfile?: {
    user: {
      firstName: string
      lastName: string
    }
  }
  _count?: {
    sections: number
  }
}

interface ReportsListProps {
  reports: ReportListItem[]
  baseUrl: string
  showStudent?: boolean
  showTeacher?: boolean
  emptyMessage?: string
}

const reportTypeLabels: Record<ReportType, string> = {
  daily: "Daily Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  term: "Term Report",
}

export function ReportsList({
  reports,
  baseUrl,
  showStudent = false,
  showTeacher = false,
  emptyMessage = "No reports found",
}: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <div className="rounded-lg border py-12 text-center">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <Link
          key={report.id}
          href={`${baseUrl}/${report.id}`}
          className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">
                  {reportTypeLabels[report.reportType]}
                </span>
                <ReportStatusBadge status={report.status} />
              </div>

              {showStudent && report.studentProfile && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {report.studentProfile.user.firstName}{" "}
                    {report.studentProfile.user.lastName}
                    <span className="ml-1 text-muted-foreground">
                      ({report.studentProfile.studentId})
                    </span>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>
                  {report.class.course.code}: {report.class.name}
                </span>
              </div>

              {showTeacher && report.teacherProfile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>
                    Teacher: {report.teacherProfile.user.firstName}{" "}
                    {report.teacherProfile.user.lastName}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(report.reportDate).toLocaleDateString()}
                </span>
                {report.publishedAt && (
                  <span>
                    Published: {new Date(report.publishedAt).toLocaleDateString()}
                  </span>
                )}
                {report._count && <span>{report._count.sections} sections</span>}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
