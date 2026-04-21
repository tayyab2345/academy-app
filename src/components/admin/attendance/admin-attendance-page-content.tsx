"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, ClipboardCheck, History, Users } from "lucide-react"
import type { AdminAttendancePageData } from "@/lib/attendance/attendance-portal-data"
import { getAttendanceStatusBadge, getSessionStatusBadge } from "@/lib/attendance-utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AdminAttendancePageContentProps = AdminAttendancePageData

export function AdminAttendancePageContent({
  classOptions,
  selectedClassId,
  selectedDate,
  classInfo,
  attendanceSession,
  students,
  summary,
  history,
}: AdminAttendancePageContentProps) {
  const router = useRouter()
  const [isNavigating, startNavigation] = useTransition()

  const navigateWithParams = (nextClassId: string, nextDate: string) => {
    const params = new URLSearchParams()

    if (nextClassId) {
      params.set("classId", nextClassId)
    }

    if (nextDate) {
      params.set("date", nextDate)
    }

    startNavigation(() => {
      router.push(`/admin/attendance?${params.toString()}`)
    })
  }

  if (classOptions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Review academy attendance by class and date
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No classes available</h3>
            <p className="text-muted-foreground">
              Create classes first to review attendance records here.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
        <p className="text-muted-foreground">
          Review attendance by class and date across your academy
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Filters</CardTitle>
          <CardDescription>
            Pick a class and date to inspect the recorded attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-attendance-class">Class</Label>
              <Select
                value={selectedClassId}
                onValueChange={(value) => navigateWithParams(value, selectedDate)}
                disabled={isNavigating}
              >
                <SelectTrigger id="admin-attendance-class">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((classOption) => (
                    <SelectItem key={classOption.id} value={classOption.id}>
                      {classOption.course.code}: {classOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-attendance-date">Date</Label>
              <Input
                id="admin-attendance-date"
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  navigateWithParams(selectedClassId, event.target.value)
                }
                disabled={isNavigating}
              />
            </div>
          </div>

          {classInfo ? (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {classInfo.name}
                    {classInfo.section ? ` (Section ${classInfo.section})` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {classInfo.course.code} - {classInfo.course.name}
                  </p>
                </div>
                <Badge variant={classInfo.status === "active" ? "success" : "secondary"}>
                  {classInfo.status}
                </Badge>
              </div>

              {attendanceSession ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Reviewing attendance from{" "}
                    {attendanceSession.title || "session record"} on{" "}
                    {new Date(attendanceSession.sessionDate).toLocaleDateString()}
                  </span>
                  <Badge
                    variant={getSessionStatusBadge(attendanceSession.status).variant as any}
                  >
                    {getSessionStatusBadge(attendanceSession.status).label}
                  </Badge>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No attendance was recorded for this class on the selected date.
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard title="Students" value={summary.total} />
        <SummaryCard title="Present" value={summary.present} tone="success" />
        <SummaryCard title="Late" value={summary.late} tone="warning" />
        <SummaryCard title="Absent" value={summary.absent} tone="danger" />
        <SummaryCard title="Excused" value={summary.excused} tone="muted" />
        <SummaryCard title="Unmarked" value={summary.unmarked} tone="muted" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daily Attendance
            </CardTitle>
            <CardDescription>
              Attendance status for enrolled students on the selected date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No active students are enrolled in this class.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marked At</TableHead>
                      <TableHead>Marked By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const badge = student.attendance
                        ? getAttendanceStatusBadge(student.attendance.status)
                        : null

                      return (
                        <TableRow key={student.studentProfile.id}>
                          <TableCell className="font-medium">
                            {student.studentProfile.user.firstName}{" "}
                            {student.studentProfile.user.lastName}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {student.studentProfile.studentId}
                          </TableCell>
                          <TableCell>
                            {badge ? (
                              <Badge variant={badge.variant as any}>
                                {badge.label}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Unmarked</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.attendance
                              ? new Date(student.attendance.markedAt).toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {student.attendance?.markedByTeacher
                              ? `${student.attendance.markedByTeacher.user.firstName} ${student.attendance.markedByTeacher.user.lastName}`
                              : "-"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Attendance History
            </CardTitle>
            <CardDescription>
              Recent attendance dates recorded for this class
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No attendance history has been recorded for this class yet.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((historyItem) => {
                  const statusBadge = getSessionStatusBadge(historyItem.status)

                  return (
                    <button
                      key={historyItem.id}
                      type="button"
                      onClick={() =>
                        navigateWithParams(
                          selectedClassId,
                          historyItem.sessionDate.slice(0, 10)
                        )
                      }
                      className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {new Date(historyItem.sessionDate).toLocaleDateString()}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {historyItem.title || "Session attendance"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>
                              Present {historyItem.summary.present}
                            </span>
                            <span>
                              Late {historyItem.summary.late}
                            </span>
                            <span>
                              Absent {historyItem.summary.absent}
                            </span>
                            <span>
                              Excused {historyItem.summary.excused}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={statusBadge.variant as any}>
                            {statusBadge.label}
                          </Badge>
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(historyItem.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: number | string
  tone?: "default" | "success" | "warning" | "danger" | "muted"
}

function SummaryCard({
  title,
  value,
  tone = "default",
}: SummaryCardProps) {
  const toneClassName =
    tone === "success"
      ? "bg-green-50 dark:bg-green-950/20"
      : tone === "warning"
        ? "bg-yellow-50 dark:bg-yellow-950/20"
        : tone === "danger"
          ? "bg-red-50 dark:bg-red-950/20"
          : tone === "muted"
            ? "bg-slate-50 dark:bg-slate-900"
            : "bg-muted/20"

  return (
    <Card className={toneClassName}>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
