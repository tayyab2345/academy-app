"use client"

import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import type {
  PortalReportListItem,
  ReportFilterClass,
} from "@/lib/reports/portal-report-data"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ReportsFilters } from "@/components/reports/reports-filters"
import { ReportsList } from "@/components/reports/reports-list"

interface StudentReportsPageContentProps {
  reports: PortalReportListItem[]
  total: number
  page: number
  limit: number
  availableClasses: ReportFilterClass[]
  appliedReportType: string
  appliedClassId: string
}

export function StudentReportsPageContent({
  reports,
  total,
  page,
  limit,
  availableClasses,
  appliedReportType,
  appliedClassId,
}: StudentReportsPageContentProps) {
  const router = useRouter()
  const reportType = appliedReportType || "all"
  const classId = appliedClassId || "all"

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams()

    if (key === "reportType" ? value !== "all" : reportType !== "all") {
      params.set(
        "reportType",
        key === "reportType" ? value : reportType
      )
    }

    if (key === "classId" ? value !== "all" : classId !== "all") {
      params.set("classId", key === "classId" ? value : classId)
    }

    params.set("page", "1")
    params.set("limit", limit.toString())

    router.push(`/student/reports?${params.toString()}`)
  }

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams()

    if (reportType !== "all") {
      params.set("reportType", reportType)
    }

    if (classId !== "all") {
      params.set("classId", classId)
    }

    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())

    router.push(`/student/reports?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Reports</h2>
        <p className="text-muted-foreground">
          View your progress reports from teachers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
          <CardDescription>Filter by report type and class</CardDescription>
        </CardHeader>
        <CardContent>
          <ReportsFilters
            reportType={reportType}
            onReportTypeChange={(value) =>
              handleFilterChange("reportType", value)
            }
            classId={classId}
            onClassIdChange={(value) => handleFilterChange("classId", value)}
            classes={availableClasses}
            onClear={() => router.push(`/student/reports?limit=${limit}`)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Reports
          </CardTitle>
          <CardDescription>
            {total} report{total !== 1 ? "s" : ""} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportsList
            reports={reports}
            baseUrl="/student/reports"
            showTeacher
            emptyMessage="No reports available yet. Your teachers will publish reports here."
          />

          {total > limit && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} reports
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {Math.ceil(total / limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
