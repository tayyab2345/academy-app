"use client"

import Link from "next/link"
import type { ReportStatus, ReportType } from "@prisma/client"
import { Eye, MoreHorizontal } from "lucide-react"
import type { AdminReportTableItem } from "@/lib/admin/admin-data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ReportStatusBadge } from "@/components/reports/report-status-badge"

interface AdminReportsTableProps {
  reports: AdminReportTableItem[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
}

const reportTypeLabels: Record<ReportType, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  term: "Term",
}

export function AdminReportsTable({
  reports,
  total,
  page,
  limit,
  onPageChange,
}: AdminReportsTableProps) {
  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Report Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No reports found
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <span className="font-medium">
                      {reportTypeLabels[report.reportType]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {report.studentProfile.user.firstName}{" "}
                        {report.studentProfile.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {report.studentProfile.studentId}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{report.class.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.class.course.code}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {report.teacherProfile.user.firstName}{" "}
                    {report.teacherProfile.user.lastName}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{new Date(report.reportDate).toLocaleDateString()}</p>
                      {report.publishedAt && (
                        <p className="text-xs text-muted-foreground">
                          Published:{" "}
                          {new Date(report.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ReportStatusBadge status={report.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {report._count.sections}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/reports/${report.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Report
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
            {total} reports
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
