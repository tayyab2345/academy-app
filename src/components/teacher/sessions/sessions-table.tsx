"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Users,
  Calendar,
  Clock,
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
import {
  formatSessionDate,
  formatSessionTime,
  getSessionStatusBadge,
  isSessionActive,
} from "@/lib/attendance-utils"

interface Session {
  id: string
  title: string | null
  sessionDate: string
  startTime: string
  endTime: string
  meetingPlatform: string
  meetingLink: string | null
  status: string
  _count: {
    attendances: number
  }
}

interface SessionsTableProps {
  sessions: Session[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onDeleted?: () => Promise<void> | void
}

export function SessionsTable({
  sessions,
  total,
  page,
  limit,
  onPageChange,
  onDeleted,
}: SessionsTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.ceil(total / limit)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/teacher/sessions/${deleteId}`, {
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
      console.error("Failed to delete session:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getPlatformBadge = (platform: string) => {
    const platforms: Record<string, string> = {
      zoom: "Zoom",
      google_meet: "Google Meet",
      teams: "Teams",
      in_person: "In Person",
    }
    return platforms[platform] || platform
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No sessions found
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => {
                const sessionData = {
                  startTime: new Date(session.startTime),
                  endTime: new Date(session.endTime),
                  status: session.status,
                }
                const statusBadge = getSessionStatusBadge(session.status)
                const active = isSessionActive(sessionData)

                return (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {session.title ||
                            `Session ${new Date(session.sessionDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatSessionDate(new Date(session.sessionDate))}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatSessionTime(new Date(session.startTime))} -{" "}
                          {formatSessionTime(new Date(session.endTime))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPlatformBadge(session.meetingPlatform)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{session._count.attendances}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge.variant as any}>
                        {statusBadge.label}
                      </Badge>
                      {active && (
                        <Badge variant="success" className="ml-2">
                          Live Now
                        </Badge>
                      )}
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
                            <Link href={`/teacher/sessions/${session.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Take Attendance
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/teacher/sessions/${session.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(session.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, total)} of {total} sessions
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
              session and all associated attendance records.
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
