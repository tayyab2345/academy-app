"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Users,
  Mail,
  Calendar,
  GraduationCap,
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
import { UserAvatar } from "@/components/ui/user-avatar"

interface Student {
  id: string
  studentId: string
  gradeLevel: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone: string | null
    avatarUrl?: string | null
    isActive: boolean
    createdAt: string
  }
  _count: {
    parentLinks: number
  }
}

interface StudentsTableProps {
  students: Student[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onDeleted?: () => Promise<void> | void
}

export function StudentsTable({
  students,
  total,
  page,
  limit,
  onPageChange,
  onDeleted,
}: StudentsTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.ceil(total / limit)

  const renderActions = (studentId: string) => (
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
          <Link href={`/admin/students/${studentId}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/students/${studentId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => setDeleteId(studentId)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/students/${deleteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        if (onDeleted) {
          await onDeleted()
        } else {
          router.refresh()
        }
        setDeleteId(null)
      }
    } catch (error) {
      console.error("Failed to delete student:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {students.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No students found
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {students.map((student) => (
              <div
                key={student.id}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <UserAvatar
                      firstName={student.user.firstName}
                      lastName={student.user.lastName}
                      avatarUrl={student.user.avatarUrl}
                      className="h-11 w-11"
                      fallbackClassName="text-sm"
                    />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-foreground">
                        {student.user.firstName} {student.user.lastName}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {student.studentId}
                      </p>
                    </div>
                  </div>
                  {renderActions(student.id)}
                </div>

                <div className="mt-4 grid gap-3 rounded-lg bg-muted/30 p-3 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="break-all">{student.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span>{student.gradeLevel || "Not set"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>
                      {student._count.parentLinks} parent
                      {student._count.parentLinks === 1 ? "" : "s"} linked
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>{new Date(student.user.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <div className="mt-1">
                      <Badge variant={student.user.isActive ? "success" : "secondary"}>
                        {student.user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-md border md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[130px]">Student ID</TableHead>
                    <TableHead className="min-w-[240px]">Student</TableHead>
                    <TableHead className="min-w-[140px]">Grade</TableHead>
                    <TableHead className="min-w-[240px]">Email</TableHead>
                    <TableHead className="min-w-[110px]">Parents</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Enrolled</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-sm">
                        {student.studentId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            firstName={student.user.firstName}
                            lastName={student.user.lastName}
                            avatarUrl={student.user.avatarUrl}
                            className="h-9 w-9"
                            fallbackClassName="text-xs"
                          />
                          <div className="min-w-0">
                            <p className="font-medium">
                              {student.user.firstName} {student.user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Student profile
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.gradeLevel || "Not set"}</TableCell>
                      <TableCell className="max-w-[260px]">
                        <span className="break-all text-sm text-muted-foreground">
                          {student.user.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {student._count.parentLinks}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.user.isActive ? "success" : "secondary"}>
                          {student.user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(student.user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{renderActions(student.id)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, total)} of {total} students
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
              This action cannot be undone. This will permanently delete the
              student account and all associated data.
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
