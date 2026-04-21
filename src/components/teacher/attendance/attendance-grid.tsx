"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Clock, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAttendanceStatusBadge } from "@/lib/attendance-utils"
import { UserAvatar } from "@/components/ui/user-avatar"

interface Student {
  studentProfile: {
    id: string
    studentId: string
    user: {
      firstName: string
      lastName: string
      avatarUrl?: string | null
      email: string
    }
  }
  attendance: {
    id: string
    status: string
    joinTime: string | Date | null
    lateMinutes: number | null
    notes: string | null
    markedByTeacher: {
      user: {
        firstName: string
        lastName: string
      }
    } | null
  } | null
}

interface AttendanceGridProps {
  students: Student[]
  sessionStatus: string
  onMarkAttendance: (studentId: string, status: string) => Promise<void>
  onBulkMark: (status: string) => Promise<void>
}

export function AttendanceGrid({
  students,
  sessionStatus,
  onMarkAttendance,
  onBulkMark,
}: AttendanceGridProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [isBulkLoading, setIsBulkLoading] = useState(false)

  const handleMarkAttendance = async (studentId: string, status: string) => {
    setIsLoading(studentId)
    try {
      await onMarkAttendance(studentId, status)
      router.refresh()
    } finally {
      setIsLoading(null)
    }
  }

  const handleBulkMark = async (status: string) => {
    setIsBulkLoading(true)
    try {
      await onBulkMark(status)
      router.refresh()
    } finally {
      setIsBulkLoading(false)
    }
  }

  const presentCount = students.filter(
    (student) => student.attendance?.status === "present"
  ).length
  const absentCount = students.filter(
    (student) => student.attendance?.status === "absent"
  ).length
  const lateCount = students.filter(
    (student) => student.attendance?.status === "late"
  ).length
  const excusedCount = students.filter(
    (student) => student.attendance?.status === "excused"
  ).length
  const unmarkedCount = students.filter((student) => !student.attendance).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-2xl font-bold">{students.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-950/20">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {presentCount}
          </p>
          <p className="text-xs text-muted-foreground">Present</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-3 text-center dark:bg-yellow-950/20">
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
            {lateCount}
          </p>
          <p className="text-xs text-muted-foreground">Late</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950/20">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">
            {absentCount}
          </p>
          <p className="text-xs text-muted-foreground">Absent</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
          <p className="text-2xl font-bold">{unmarkedCount}</p>
          <p className="text-xs text-muted-foreground">Unmarked</p>
        </div>
      </div>

      {sessionStatus !== "completed" && sessionStatus !== "cancelled" && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkMark("present")}
            disabled={isBulkLoading || unmarkedCount === 0}
          >
            <Check className="mr-2 h-4 w-4 text-green-600" />
            Mark All Present
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkMark("absent")}
            disabled={isBulkLoading || unmarkedCount === 0}
          >
            <X className="mr-2 h-4 w-4 text-red-600" />
            Mark All Absent
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Join Time</TableHead>
              <TableHead>Late (min)</TableHead>
              <TableHead>Marked By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const attendance = student.attendance
              const statusBadge = attendance
                ? getAttendanceStatusBadge(attendance.status)
                : null
              const isMarked = !!attendance

              return (
                <TableRow key={student.studentProfile.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        firstName={student.studentProfile.user.firstName}
                        lastName={student.studentProfile.user.lastName}
                        avatarUrl={student.studentProfile.user.avatarUrl}
                        className="h-8 w-8"
                      />
                      <div>
                        <p className="font-medium">
                          {student.studentProfile.user.firstName}{" "}
                          {student.studentProfile.user.lastName}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {student.studentProfile.studentId}
                  </TableCell>
                  <TableCell>
                    {isMarked ? (
                      <Badge variant={statusBadge?.variant as any}>
                        {statusBadge?.label}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unmarked</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {attendance?.joinTime
                      ? new Date(attendance.joinTime).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {attendance?.lateMinutes ? (
                      <span className="text-yellow-600">{attendance.lateMinutes}</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {attendance?.markedByTeacher
                      ? `${attendance.markedByTeacher.user.firstName} ${attendance.markedByTeacher.user.lastName}`
                      : attendance?.joinTime
                        ? "Auto-marked"
                        : "-"}
                  </TableCell>
                  <TableCell>
                    {sessionStatus !== "completed" &&
                      sessionStatus !== "cancelled" && (
                        <Select
                          value={attendance?.status || ""}
                          onValueChange={(value) =>
                            handleMarkAttendance(
                              student.studentProfile.id,
                              value
                            )
                          }
                          disabled={isLoading === student.studentProfile.id}
                        >
                          <SelectTrigger className="w-[130px]">
                            {isLoading === student.studentProfile.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue placeholder="Mark" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">
                              <span className="flex items-center">
                                <Check className="mr-2 h-4 w-4 text-green-600" />
                                Present
                              </span>
                            </SelectItem>
                            <SelectItem value="late">
                              <span className="flex items-center">
                                <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                                Late
                              </span>
                            </SelectItem>
                            <SelectItem value="absent">
                              <span className="flex items-center">
                                <X className="mr-2 h-4 w-4 text-red-600" />
                                Absent
                              </span>
                            </SelectItem>
                            <SelectItem value="excused">
                              <span className="flex items-center">
                                <AlertCircle className="mr-2 h-4 w-4 text-blue-600" />
                                Excused
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
