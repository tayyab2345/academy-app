"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Calendar,
  Mail,
  Phone,
  BadgeCheck,
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

interface Teacher {
  id: string
  employeeId: string | null
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
}

interface TeachersTableProps {
  teachers: Teacher[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onDeleted?: () => Promise<void> | void
}

export function TeachersTable({
  teachers,
  total,
  page,
  limit,
  onPageChange,
  onDeleted,
}: TeachersTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.ceil(total / limit)

  const renderActions = (teacherId: string) => (
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
          <Link href={`/admin/teachers/${teacherId}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/teachers/${teacherId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => setDeleteId(teacherId)}
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
      const response = await fetch(`/api/admin/teachers/${deleteId}`, {
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
      console.error("Failed to delete teacher:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {teachers.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No teachers found
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <UserAvatar
                      firstName={teacher.user.firstName}
                      lastName={teacher.user.lastName}
                      avatarUrl={teacher.user.avatarUrl}
                      className="h-11 w-11"
                      fallbackClassName="text-sm"
                    />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-foreground">
                        {teacher.user.firstName} {teacher.user.lastName}
                      </p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {teacher.user.email}
                      </p>
                    </div>
                  </div>
                  {renderActions(teacher.id)}
                </div>

                <div className="mt-4 grid gap-3 rounded-lg bg-muted/30 p-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Employee ID
                    </p>
                    <p className="mt-1 font-medium">{teacher.employeeId || "Not assigned"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <div className="mt-1">
                      <Badge variant={teacher.user.isActive ? "success" : "secondary"}>
                        {teacher.user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{teacher.user.phone || "No phone added"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>{new Date(teacher.user.createdAt).toLocaleDateString()}</span>
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
                    <TableHead className="min-w-[240px]">Teacher</TableHead>
                    <TableHead className="min-w-[130px]">Employee ID</TableHead>
                    <TableHead className="min-w-[240px]">Email</TableHead>
                    <TableHead className="min-w-[150px]">Phone</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Joined</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            firstName={teacher.user.firstName}
                            lastName={teacher.user.lastName}
                            avatarUrl={teacher.user.avatarUrl}
                            className="h-9 w-9"
                            fallbackClassName="text-xs"
                          />
                          <div className="min-w-0">
                            <p className="font-medium">
                              {teacher.user.firstName} {teacher.user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Teacher profile
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {teacher.employeeId || "Not assigned"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="flex items-start gap-2">
                          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="break-all text-sm text-muted-foreground">
                            {teacher.user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {teacher.user.phone || "No phone added"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={teacher.user.isActive ? "success" : "secondary"}>
                          {teacher.user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(teacher.user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{renderActions(teacher.id)}</TableCell>
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
            {Math.min(page * limit, total)} of {total} teachers
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
              teacher account and all associated data.
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
