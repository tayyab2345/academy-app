"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  ClipboardCheck,
  History,
  Timer,
  Users,
} from "lucide-react"
import type { AdminAttendancePageData } from "@/lib/attendance/attendance-portal-data"
import {
  formatLateThresholdLabel,
  getAttendanceStatusBadge,
  getSessionJoinStatusBadge,
  getSessionStatusBadge,
} from "@/lib/attendance-utils"
import { Badge } from "@/components/ui/badge"
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
  teacherJoins,
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
    <div className="space-y-6 overflow-x-hidden">
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
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="admin-attendance-class">Class</Label>
              <Select
                value={selectedClassId}
                onValueChange={(value) => navigateWithParams(value, selectedDate)}
                disabled={isNavigating}
              >
                <SelectTrigger id="admin-attendance-class" className="w-full">
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

            <div className="space-y-2 min-w-0">
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold break-words">
                    {classInfo.name}
                    {classInfo.section ? ` (Section ${classInfo.section})` : ""}
                  </p>
                  <p className="break-words text-sm text-muted-foreground">
                    {classInfo.course.code} - {classInfo.course.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatLateThresholdLabel(classInfo.lateThresholdMinutes)}
                  </p>
                </div>
                <Badge
                  className="w-fit"
                  variant={classInfo.status === "active" ? "success" : "secondary"}
                >
                  {classInfo.status}
                </Badge>
              </div>

              {attendanceSession ? (
                <div className="mt-3 flex flex-wrap items-start gap-2 text-sm text-muted-foreground">
                  <span className="min-w-0 break-words">
                    Reviewing attendance from{" "}
                    {attendanceSession.title || "session record"} on{" "}
                    {new Date(attendanceSession.sessionDate).toLocaleDateString()}
                  </span>
                  <Badge
                    className="w-fit"
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard title="Students" value={summary.total} />
        <SummaryCard title="Present" value={summary.present} tone="success" />
        <SummaryCard title="Late" value={summary.late} tone="warning" />
        <SummaryCard title="Absent" value={summary.absent} tone="danger" />
        <SummaryCard title="Excused" value={summary.excused} tone="muted" />
        <SummaryCard title="Unmarked" value={summary.unmarked} tone="muted" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="min-w-0">
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
              <div className="space-y-3">
                <div className="space-y-3 md:hidden">
                  {students.map((student) => {
                    const badge = student.attendance
                      ? getAttendanceStatusBadge(student.attendance.status)
                      : null

                    return (
                      <div
                        key={student.studentProfile.id}
                        className="rounded-lg border p-4"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-2">
                            <div className="min-w-0">
                              <p className="break-words font-medium">
                                {student.studentProfile.user.firstName}{" "}
                                {student.studentProfile.user.lastName}
                              </p>
                              <p className="break-all font-mono text-xs text-muted-foreground">
                                {student.studentProfile.studentId}
                              </p>
                            </div>
                            {badge ? (
                              <Badge className="w-fit" variant={badge.variant as any}>
                                {badge.label}
                              </Badge>
                            ) : (
                              <Badge className="w-fit" variant="outline">
                                Unmarked
                              </Badge>
                            )}
                          </div>

                          <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <InfoPair
                              label="Joined At"
                              value={
                                student.attendance?.joinTime
                                  ? new Date(
                                      student.attendance.joinTime
                                    ).toLocaleString()
                                  : "-"
                              }
                            />
                            <InfoPair
                              label="Late Minutes"
                              value={String(student.attendance?.lateMinutes ?? "-")}
                            />
                            <InfoPair
                              label="Marked At"
                              value={
                                student.attendance
                                  ? new Date(
                                      student.attendance.markedAt
                                    ).toLocaleString()
                                  : "-"
                              }
                            />
                            <InfoPair
                              label="Marked By"
                              value={
                                student.attendance?.markedByTeacher
                                  ? `${student.attendance.markedByTeacher.user.firstName} ${student.attendance.markedByTeacher.user.lastName}`
                                  : "-"
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="hidden md:block">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined At</TableHead>
                        <TableHead>Late Minutes</TableHead>
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
                            <TableCell className="whitespace-nowrap">
                              {student.attendance?.joinTime
                                ? new Date(student.attendance.joinTime).toLocaleString()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {student.attendance?.lateMinutes ?? "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
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
              </div>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Teacher Join Tracking
              </CardTitle>
              <CardDescription>
                Review when assigned teachers joined this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teacherJoins.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No teacher join records are available for this session yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {teacherJoins.map((teacherJoin) => {
                    const joinBadge = getSessionJoinStatusBadge(teacherJoin.status)

                    return (
                      <div
                        key={teacherJoin.id}
                        className="rounded-lg border p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words font-medium">
                              {teacherJoin.teacher.firstName}{" "}
                              {teacherJoin.teacher.lastName}
                            </p>
                            <p className="break-all text-sm text-muted-foreground">
                              {teacherJoin.teacher.email}
                            </p>
                          </div>
                          <Badge className="w-fit" variant={joinBadge.variant as any}>
                            {joinBadge.label}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          <p className="break-words">
                            Joined at{" "}
                            {new Date(teacherJoin.joinTime).toLocaleString()}
                          </p>
                          <p className="break-words">
                            {teacherJoin.lateMinutes > 0
                              ? `${teacherJoin.lateMinutes} minute${teacherJoin.lateMinutes === 1 ? "" : "s"} late`
                              : "Joined on time"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
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
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium">
                              {new Date(historyItem.sessionDate).toLocaleDateString()}
                            </p>
                            <p className="mt-1 break-words text-sm text-muted-foreground">
                              {historyItem.title || "Session attendance"}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>Present {historyItem.summary.present}</span>
                              <span>Late {historyItem.summary.late}</span>
                              <span>Absent {historyItem.summary.absent}</span>
                              <span>Excused {historyItem.summary.excused}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                            <Badge className="w-fit" variant={statusBadge.variant as any}>
                              {statusBadge.label}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
    </div>
  )
}

interface InfoPairProps {
  label: string
  value: string
}

function InfoPair({ label, value }: InfoPairProps) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm">{value}</p>
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
        <CardTitle className="break-words text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
