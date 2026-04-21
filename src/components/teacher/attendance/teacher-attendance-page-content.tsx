"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  ClipboardCheck,
  Loader2,
  Save,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  TeacherAttendancePageData,
  TeacherAttendanceStatus,
} from "@/lib/teacher/teacher-attendance-data"
import { getAttendanceStatusBadge } from "@/lib/attendance-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { UserAvatar } from "@/components/ui/user-avatar"

type TeacherAttendancePageContentProps = TeacherAttendancePageData

const statusOptions: Array<{
  value: TeacherAttendanceStatus
  label: string
  activeClassName: string
}> = [
  {
    value: "present",
    label: "Present",
    activeClassName:
      "border-green-600 bg-green-600 text-white hover:bg-green-600 hover:text-white",
  },
  {
    value: "late",
    label: "Late",
    activeClassName:
      "border-yellow-500 bg-yellow-500 text-white hover:bg-yellow-500 hover:text-white",
  },
  {
    value: "absent",
    label: "Absent",
    activeClassName:
      "border-red-600 bg-red-600 text-white hover:bg-red-600 hover:text-white",
  },
  {
    value: "excused",
    label: "Excused",
    activeClassName:
      "border-slate-600 bg-slate-600 text-white hover:bg-slate-600 hover:text-white",
  },
]

type AttendanceStatusMap = Record<string, TeacherAttendanceStatus | "">

function buildInitialStatuses(
  students: TeacherAttendancePageData["students"]
): AttendanceStatusMap {
  return students.reduce<AttendanceStatusMap>((accumulator, student) => {
    accumulator[student.studentProfile.id] = student.attendance?.status || ""
    return accumulator
  }, {})
}

export function TeacherAttendancePageContent({
  classOptions,
  selectedClassId,
  selectedDate,
  classInfo,
  attendanceSession,
  students,
}: TeacherAttendancePageContentProps) {
  const router = useRouter()
  const [isNavigating, startNavigation] = useTransition()
  const [attendanceStatuses, setAttendanceStatuses] = useState<AttendanceStatusMap>(
    () => buildInitialStatuses(students)
  )
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setAttendanceStatuses(buildInitialStatuses(students))
  }, [students])

  useEffect(() => {
    setSuccessMessage(null)
    setErrorMessage(null)
  }, [selectedClassId, selectedDate])

  const localSummary = useMemo(() => {
    return students.reduce(
      (accumulator, student) => {
        accumulator.total += 1

        const status = attendanceStatuses[student.studentProfile.id]

        if (!status) {
          accumulator.unmarked += 1
          return accumulator
        }

        accumulator[status] += 1
        return accumulator
      },
      {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        unmarked: 0,
      }
    )
  }, [attendanceStatuses, students])

  const navigateWithParams = (nextClassId: string, nextDate: string) => {
    const params = new URLSearchParams()

    if (nextClassId) {
      params.set("classId", nextClassId)
    }

    if (nextDate) {
      params.set("date", nextDate)
    }

    startNavigation(() => {
      router.push(`/teacher/attendance?${params.toString()}`)
    })
  }

  const handleMarkAllPresent = () => {
    setAttendanceStatuses((current) => {
      const next = { ...current }

      for (const student of students) {
        next[student.studentProfile.id] = "present"
      }

      return next
    })
  }

  const handleStatusChange = (
    studentProfileId: string,
    status: TeacherAttendanceStatus
  ) => {
    setAttendanceStatuses((current) => ({
      ...current,
      [studentProfileId]: status,
    }))
  }

  const handleSave = async () => {
    if (!selectedClassId || students.length === 0) {
      return
    }

    const attendancePayload = students
      .map((student) => {
        const status = attendanceStatuses[student.studentProfile.id]

        if (!status) {
          return null
        }

        return {
          studentProfileId: student.studentProfile.id,
          status,
          notes: student.attendance?.notes || undefined,
        }
      })
      .filter((record): record is NonNullable<typeof record> => record !== null)

    if (attendancePayload.length === 0) {
      setErrorMessage("Mark at least one student before saving attendance.")
      setSuccessMessage(null)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: selectedClassId,
          date: selectedDate,
          attendance: attendancePayload,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save attendance")
      }

      setSuccessMessage(
        `Attendance saved for ${data.savedCount} student${
          data.savedCount !== 1 ? "s" : ""
        }.`
      )
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save attendance"
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (classOptions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Mark attendance for your assigned classes
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No classes assigned</h3>
            <p className="text-muted-foreground">
              You need an active class assignment before you can mark attendance.
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
          Select a class and date to mark or update attendance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Controls</CardTitle>
          <CardDescription>
            Choose the class and date you want to work with
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="attendance-class">Class</Label>
              <Select
                value={selectedClassId}
                onValueChange={(value) => navigateWithParams(value, selectedDate)}
                disabled={isNavigating}
              >
                <SelectTrigger id="attendance-class">
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
              <Label htmlFor="attendance-date">Date</Label>
              <Input
                id="attendance-date"
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
                    Existing attendance loaded from{" "}
                    {attendanceSession.title || "session record"} on{" "}
                    {new Date(attendanceSession.sessionDate).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/teacher/sessions/${attendanceSession.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    View session
                  </Link>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No attendance record exists for this class and date yet. Saving
                  will create one safely.
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {successMessage ? (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Attendance saved</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to save attendance</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Attendance
            </CardTitle>
            <CardDescription>
              Use the quick selectors below and save when you&apos;re done
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleMarkAllPresent}
              disabled={students.length === 0 || isSaving}
            >
              Mark All Present
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={students.length === 0 || isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {attendanceSession ? "Update Attendance" : "Save Attendance"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="mt-2 text-2xl font-semibold">{localSummary.total}</p>
            </div>
            <div className="rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
              <p className="text-sm font-medium text-muted-foreground">Present</p>
              <p className="mt-2 text-2xl font-semibold text-green-700 dark:text-green-400">
                {localSummary.present}
              </p>
            </div>
            <div className="rounded-lg border bg-yellow-50 p-4 dark:bg-yellow-950/20">
              <p className="text-sm font-medium text-muted-foreground">Late</p>
              <p className="mt-2 text-2xl font-semibold text-yellow-700 dark:text-yellow-400">
                {localSummary.late}
              </p>
            </div>
            <div className="rounded-lg border bg-red-50 p-4 dark:bg-red-950/20">
              <p className="text-sm font-medium text-muted-foreground">Absent</p>
              <p className="mt-2 text-2xl font-semibold text-red-700 dark:text-red-400">
                {localSummary.absent}
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-sm font-medium text-muted-foreground">Excused</p>
              <p className="mt-2 text-2xl font-semibold">{localSummary.excused}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-sm font-medium text-muted-foreground">Unmarked</p>
              <p className="mt-2 text-2xl font-semibold">{localSummary.unmarked}</p>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="rounded-lg border border-dashed px-6 py-10 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No enrolled students</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This class does not have any active students to mark attendance for.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => {
                const currentStatus = attendanceStatuses[student.studentProfile.id]
                const statusBadge = currentStatus
                  ? getAttendanceStatusBadge(currentStatus)
                  : null

                return (
                  <div
                    key={student.studentProfile.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          firstName={student.studentProfile.user.firstName}
                          lastName={student.studentProfile.user.lastName}
                          avatarUrl={student.studentProfile.user.avatarUrl}
                          className="h-10 w-10"
                        />
                        <div>
                          <p className="font-medium">
                            {student.studentProfile.user.firstName}{" "}
                            {student.studentProfile.user.lastName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono">
                              {student.studentProfile.studentId}
                            </span>
                            {statusBadge ? (
                              <Badge variant={statusBadge.variant as any}>
                                {statusBadge.label}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Unmarked</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((statusOption) => (
                          <Button
                            key={statusOption.value}
                            type="button"
                            size="sm"
                            variant={currentStatus === statusOption.value ? "default" : "outline"}
                            className={cn(
                              "min-w-[88px]",
                              currentStatus === statusOption.value &&
                                statusOption.activeClassName
                            )}
                            onClick={() =>
                              handleStatusChange(
                                student.studentProfile.id,
                                statusOption.value
                              )
                            }
                            disabled={isSaving}
                          >
                            {statusOption.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
