"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Trash2, Eye, Users, GraduationCap } from "lucide-react"

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

interface ClassRow {
  id: string
  name: string
  section: string | null
  academicYear: string
  status: string
  startDate: string | null
  endDate: string | null
  course: {
    id: string
    code: string
    name: string
    subjectArea: string
  }
  _count: {
    enrollments: number
    teachers: number
  }
}

interface ClassesTableProps {
  classes: ClassRow[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onDeleted?: () => Promise<void> | void
}

export function ClassesTable({
  classes,
  total,
  page,
  limit,
  onPageChange,
  onDeleted,
}: ClassesTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.ceil(total / limit)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/classes/${deleteId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete class")
      }

      if (onDeleted) {
        await onDeleted()
      } else {
        router.refresh()
      }
      setDeleteId(null)
    } catch (error) {
      console.error("Failed to delete class:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>
      case "completed":
        return <Badge variant="secondary">Completed</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <>
      <DesktopTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Academic Year</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Teachers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No classes found
                </TableCell>
              </TableRow>
            ) : (
              classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      {cls.section && (
                        <p className="text-sm text-muted-foreground">Section {cls.section}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-mono text-sm">{cls.course.code}</p>
                      <p className="text-sm text-muted-foreground">{cls.course.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>{cls.academicYear || "Not set"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{cls._count.enrollments}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span>{cls._count.teachers}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(cls.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>
                        {cls.startDate
                          ? new Date(cls.startDate).toLocaleDateString()
                          : "Not set"}
                      </p>
                      <p className="text-muted-foreground">to</p>
                      <p>
                        {cls.endDate
                          ? new Date(cls.endDate).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
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
                          <Link href={`/admin/classes/${cls.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/classes/${cls.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(cls.id)}
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
        {classes.length === 0 ? (
          <MobileEmptyState
            title="No classes found"
            description="Create a class and assign students from the admin setup."
          />
        ) : (
          classes.map((cls) => (
            <MobileListCard key={cls.id}>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold leading-6">
                    {cls.name}
                  </p>
                  {cls.section ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Section {cls.section}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {getStatusBadge(cls.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Class actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/classes/${cls.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/classes/${cls.id}/edit`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(cls.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-xl bg-muted/25 p-3">
                <MobileDetailRow label="Course">
                  <span className="block break-words">{cls.course.name}</span>
                  <span className="mt-0.5 block break-all font-mono text-xs text-muted-foreground">
                    {cls.course.code}
                  </span>
                </MobileDetailRow>
                <MobileDetailRow label="Academic">
                  {cls.academicYear || "Not set"}
                </MobileDetailRow>
                <MobileDetailRow label="Students">
                  <span className="inline-flex items-center justify-end gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {cls._count.enrollments}
                  </span>
                </MobileDetailRow>
                <MobileDetailRow label="Teachers">
                  <span className="inline-flex items-center justify-end gap-1">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    {cls._count.teachers}
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
            {Math.min(page * limit, total)} of {total} classes
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
              This action cannot be undone. This will permanently delete the class
              and all associated data including enrollments and teacher assignments.
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
