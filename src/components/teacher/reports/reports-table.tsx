"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  CalendarDays,
  Download,
  Eye,
  FileText,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  User,
} from "lucide-react"
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

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Not set"
  }

  return date.toLocaleDateString()
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

  const handlePublish = async (reportId: string) => {
    await fetch(`/api/teacher/reports/${reportId}/publish`, {
      method: "POST",
    })
    router.refresh()
  }

  return (
    <>
      <div className="hidden rounded-md border md:block">
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
                      <p>{formatDate(report.periodStart)}</p>
                      <p className="text-muted-foreground">to</p>
                      <p>{formatDate(report.periodEnd)}</p>
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
                    {formatDate(report.reportDate)}
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
                        <DropdownMenuItem asChild>
                          <a
                            href={`/api/reports/${report.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </a>
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
                          <DropdownMenuItem onClick={() => handlePublish(report.id)}>
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

      <div className="space-y-3 md:hidden">
        {reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No reports found</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Create your first student progress report.
            </p>
            <Button asChild className="mt-5 w-full max-w-xs">
              <Link href="/teacher/reports/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Report
              </Link>
            </Button>
          </div>
        ) : (
          reports.map((report) => {
            const reportType =
              reportTypeLabels[report.reportType] || report.reportType
            const studentName = `${report.studentProfile.user.firstName} ${report.studentProfile.user.lastName}`.trim()
            const period = `${formatDate(report.periodStart)} - ${formatDate(
              report.periodEnd
            )}`

            return (
              <article
                key={report.id}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {reportType} Report
                      </p>
                      <h3 className="mt-1 break-words text-base font-semibold leading-snug">
                        {studentName || "Student"}
                      </h3>
                    </div>
                    <ReportStatusBadge status={report.status as any} />
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          Class
                        </p>
                        <p className="break-words font-medium">
                          {report.class.name}
                        </p>
                        <p className="break-words text-xs text-muted-foreground">
                          {report.class.course.code}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                      <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Period
                          </p>
                          <p className="text-sm font-medium">{period}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                        <Layers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Sections
                          </p>
                          <p className="text-sm font-medium">
                            {report._count.sections} section
                            {report._count.sections !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          Student ID
                        </p>
                        <p className="break-words text-sm font-medium">
                          {report.studentProfile.studentId || "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 border-t pt-3 min-[380px]:grid-cols-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Link href={`/teacher/reports/${report.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <a
                        href={`/api/reports/${report.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </a>
                    </Button>
                    {report.status === "draft" && (
                      <>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Link href={`/teacher/reports/${report.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handlePublish(report.id)}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Publish
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(report.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
            {total} reports
          </p>
          <div className="grid grid-cols-2 items-center gap-2 sm:flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="w-full sm:w-auto"
            >
              Previous
            </Button>
            <span className="col-span-2 row-start-1 text-center text-sm sm:col-auto sm:row-auto">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="w-full sm:w-auto"
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
