"use client"

import Link from "next/link"
import { Calendar, ChevronRight } from "lucide-react"
import { ReportStatusBadge } from "./report-status-badge"

interface ReportTimelineCardProps {
  report: {
    id: string
    reportType: string
    reportDate: string
    status: string
    class: {
      name: string
      course: {
        code: string
        name: string
      }
    }
  }
  href: string
}

const reportTypeLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  term: "Term",
}

export function ReportTimelineCard({
  report,
  href,
}: ReportTimelineCardProps) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-center gap-4">
          <div className="flex min-w-[60px] flex-col items-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-xs text-muted-foreground">
              {new Date(report.reportDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {reportTypeLabels[report.reportType] || report.reportType} Report
              </span>
              <ReportStatusBadge status={report.status as any} />
            </div>
            <p className="text-sm text-muted-foreground">
              {report.class.course.code}: {report.class.name}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </Link>
  )
}
