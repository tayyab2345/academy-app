"use client"

import { useRouter } from "next/navigation"
import { FileText, Users } from "lucide-react"
import type {
  ParentReportChild,
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

interface ParentReportsPageContentProps {
  reports: PortalReportListItem[]
  total: number
  page: number
  limit: number
  children: ParentReportChild[]
  availableClasses: ReportFilterClass[]
  appliedReportType: string
  appliedStudentId: string
  appliedClassId: string
}

export function ParentReportsPageContent({
  reports,
  total,
  page,
  limit,
  children,
  availableClasses,
  appliedReportType,
  appliedStudentId,
  appliedClassId,
}: ParentReportsPageContentProps) {
  const router = useRouter()
  const reportType = appliedReportType || "all"
  const studentId = appliedStudentId || "all"
  const classId = appliedClassId || "all"

  const buildParams = (overrides?: Partial<Record<"reportType" | "studentId" | "classId", string>>) => {
    const params = new URLSearchParams()
    const nextReportType = overrides?.reportType ?? reportType
    const nextStudentId = overrides?.studentId ?? studentId
    const nextClassId = overrides?.classId ?? classId

    if (nextReportType !== "all") {
      params.set("reportType", nextReportType)
    }

    if (nextStudentId !== "all") {
      params.set("studentId", nextStudentId)
    }

    if (nextClassId !== "all") {
      params.set("classId", nextClassId)
    }

    params.set("page", "1")
    params.set("limit", limit.toString())

    return params
  }

  const handlePageChange = (nextPage: number) => {
    const params = buildParams()
    params.set("page", nextPage.toString())
    router.push(`/parent/reports?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Children&apos;s Reports</h2>
        <p className="text-muted-foreground">
          View progress reports for your children
        </p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No linked children</h3>
            <p className="text-muted-foreground">
              You don&apos;t have any children linked to your account yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Filter Reports</CardTitle>
              <CardDescription>
                Filter by report type, child, and class
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportsFilters
                reportType={reportType}
                onReportTypeChange={(value) =>
                  router.push(`/parent/reports?${buildParams({ reportType: value }).toString()}`)
                }
                studentId={studentId}
                onStudentIdChange={(value) =>
                  router.push(`/parent/reports?${buildParams({ studentId: value }).toString()}`)
                }
                classId={classId}
                onClassIdChange={(value) =>
                  router.push(`/parent/reports?${buildParams({ classId: value }).toString()}`)
                }
                classes={availableClasses}
                children={children}
                onClear={() => router.push(`/parent/reports?limit=${limit}`)}
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
                baseUrl="/parent/reports"
                showStudent
                showTeacher
                emptyMessage="No reports available yet."
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
        </>
      )}
    </div>
  )
}
