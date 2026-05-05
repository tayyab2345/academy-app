"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Trash2, Eye, BookOpen } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  DesktopTableShell,
  MobileCards,
  MobileDetailRow,
  MobileEmptyState,
  MobileListCard,
} from "@/components/admin/responsive-list"

interface Course {
  id: string
  code: string
  name: string
  gradeLevel: string
  subjectArea: string
  isActive: boolean
  createdAt: string
  _count: {
    classes: number
  }
}

interface CoursesTableProps {
  courses: Course[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onDeleted?: () => Promise<void> | void
}

export function CoursesTable({
  courses,
  total,
  page,
  limit,
  onPageChange,
  onDeleted,
}: CoursesTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.ceil(total / limit)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/courses/${deleteId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete course")
      }

      if (onDeleted) {
        await onDeleted()
      } else {
        router.refresh()
      }
      setDeleteId(null)
    } catch (error) {
      console.error("Failed to delete course:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DesktopTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Classes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-mono text-sm">{course.code}</TableCell>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>{course.gradeLevel || "Not set"}</TableCell>
                  <TableCell>{course.subjectArea}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{course._count.classes}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={course.isActive ? "success" : "secondary"}>
                      {course.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(course.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/courses/${course.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/courses/${course.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(course.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DesktopTableShell>

      <MobileCards>
        {courses.length === 0 ? (
          <MobileEmptyState
            title="No courses found"
            description="Create a course to start building your academy catalog."
          />
        ) : (
          courses.map((course) => (
            <MobileListCard key={course.id}>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold leading-6">
                    {course.name}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {course.code}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant={course.isActive ? "success" : "secondary"}>
                    {course.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Course actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/courses/${course.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/courses/${course.id}/edit`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(course.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-xl bg-muted/25 p-3">
                <MobileDetailRow label="Code">
                  <span className="break-all font-mono">{course.code}</span>
                </MobileDetailRow>
                <MobileDetailRow label="Grade">
                  {course.gradeLevel || "Not set"}
                </MobileDetailRow>
                <MobileDetailRow label="Subject">{course.subjectArea}</MobileDetailRow>
                <MobileDetailRow label="Classes">
                  <span className="inline-flex items-center justify-end gap-1">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    {course._count.classes}
                  </span>
                </MobileDetailRow>
              </div>
            </MobileListCard>
          ))
        )}
      </MobileCards>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, total)} of {total} courses
          </p>
          <div className="flex flex-wrap items-center gap-2">
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
              This action cannot be undone. Courses with existing classes cannot
              be deleted until those classes are removed.
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
