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
  Phone,
  Calendar,
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

interface Parent {
  id: string
  occupation: string | null
  preferredContactMethod: string
  isPrimaryContact: boolean
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
    studentLinks: number
  }
}

interface ParentsTableProps {
  parents: Parent[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onDeleted?: () => Promise<void> | void
}

export function ParentsTable({
  parents,
  total,
  page,
  limit,
  onPageChange,
  onDeleted,
}: ParentsTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.ceil(total / limit)

  const renderActions = (parentId: string) => (
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
          <Link href={`/admin/parents/${parentId}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/parents/${parentId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => setDeleteId(parentId)}
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
      const response = await fetch(`/api/admin/parents/${deleteId}`, {
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
      console.error("Failed to delete parent:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {parents.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No parents found
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {parents.map((parent) => (
              <div
                key={parent.id}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <UserAvatar
                      firstName={parent.user.firstName}
                      lastName={parent.user.lastName}
                      avatarUrl={parent.user.avatarUrl}
                      className="h-11 w-11"
                      fallbackClassName="text-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-sm font-semibold text-foreground">
                          {parent.user.firstName} {parent.user.lastName}
                        </p>
                        {parent.isPrimaryContact ? (
                          <Badge variant="outline" className="text-[10px]">
                            Primary
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {parent.user.email}
                      </p>
                    </div>
                  </div>
                  {renderActions(parent.id)}
                </div>

                <div className="mt-4 grid gap-3 rounded-lg bg-muted/30 p-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{parent.user.phone || "No phone added"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>
                      {parent._count.studentLinks} child
                      {parent._count.studentLinks === 1 ? "" : "ren"} linked
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground capitalize">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>{parent.preferredContactMethod}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>{new Date(parent.user.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <div className="mt-1">
                      <Badge variant={parent.user.isActive ? "success" : "secondary"}>
                        {parent.user.isActive ? "Active" : "Inactive"}
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
                    <TableHead className="min-w-[240px]">Parent</TableHead>
                    <TableHead className="min-w-[240px]">Email</TableHead>
                    <TableHead className="min-w-[150px]">Phone</TableHead>
                    <TableHead className="min-w-[110px]">Children</TableHead>
                    <TableHead className="min-w-[150px]">Contact Method</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Joined</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parents.map((parent) => (
                    <TableRow key={parent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            firstName={parent.user.firstName}
                            lastName={parent.user.lastName}
                            avatarUrl={parent.user.avatarUrl}
                            className="h-9 w-9"
                            fallbackClassName="text-xs"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">
                                {parent.user.firstName} {parent.user.lastName}
                              </p>
                              {parent.isPrimaryContact ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Primary
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Parent profile
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <span className="break-all text-sm text-muted-foreground">
                          {parent.user.email}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {parent.user.phone || "No phone added"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {parent._count.studentLinks}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {parent.preferredContactMethod}
                      </TableCell>
                      <TableCell>
                        <Badge variant={parent.user.isActive ? "success" : "secondary"}>
                          {parent.user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(parent.user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{renderActions(parent.id)}</TableCell>
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
            {Math.min(page * limit, total)} of {total} parents
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
              parent account and remove all student links.
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
