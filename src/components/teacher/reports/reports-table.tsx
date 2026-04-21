"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Eye, Pencil, Trash2, Send } from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ReportStatusBadge } from "@/components/reports/report-status-badge"

interface Report {
  id: string
  reportType: string
  reportDate: string
  periodStart: string
  periodEnd: string
  status: string
  studentProfile: {
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
  _count: {
    sections: number
  }
}

interface ReportsTableProps {
  reports: Report[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
}

const reportTypeLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  term: "Term",
}

export function ReportsTable({
  reports,
  total,
  page,
  limit,
  onPageChange,
}: ReportsTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.ceil(total / limit)

  const handleDelete = async () => {
    if (!deleteId) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/teacher/reports/${deleteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        router.refresh()
        setDeleteId(null)
      }
    } catch (error) {
      console.error("Failed to delete report:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
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
                      {reportTypeLabels[report.reportType] || report.reportType}
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
                    <div className="text-sm">
                      <p>{new Date(report.periodStart).toLocaleDateString()}</p>
                      <p className="text-muted-foreground">to</p>
                      <p>{new Date(report.periodEnd).toLocaleDateString()}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {report._count.sections} sections
                    </span>
                  </TableCell>
                  <TableCell>
                    <ReportStatusBadge status={report.status as any} />
                  </TableCell>
                  <TableCell>
                    {new Date(report.reportDate).toLocaleDateString()}
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
                          <Link href={`/teacher/reports/${report.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        {report.status === "draft" && (
                          <DropdownMenuItem asChild>
                            <Link href={`/teacher/reports/${report.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {report.status === "draft" && (
                          <DropdownMenuItem
                            onClick={async () => {
                              await fetch(`/api/teacher/reports/${report.id}/publish`, {
                                method: "POST",
                              })
                              router.refresh()
                            }}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        {report.status === "draft" && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(report.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the report
              and all associated sections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
