"use client"

import {
  formatSessionDate,
  formatSessionTime,
  getAttendanceStatusBadge,
} from "@/lib/attendance-utils"
import type { AttendanceRecordListItem } from "@/lib/attendance/attendance-portal-data"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface AttendanceRecordsTableProps {
  records: AttendanceRecordListItem[]
  emptyMessage: string
  showStudent?: boolean
  showMarkedBy?: boolean
}

export function AttendanceRecordsTable({
  records,
  emptyMessage,
  showStudent = false,
  showMarkedBy = false,
}: AttendanceRecordsTableProps) {
  const showJoinDetails = records.some(
    (record) => record.joinTime || (record.lateMinutes || 0) > 0
  )

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage || "No attendance records found"}
      </div>
    )
  }

  return (
    <div className="w-full max-w-full">
      <div className="space-y-3 md:hidden">
        {records.map((record) => {
          const statusBadge = getAttendanceStatusBadge(record.status)
          const classLabel = `${record.class.course.code}: ${record.class.name}`
          const sessionTime = getSessionTimeLabel(record)
          const lateMinutes = record.lateMinutes || 0

          return (
            <article
              key={record.id}
              className="w-full rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {record.student ? (
                    <div className="mb-3 rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Child
                      </p>
                      <p className="break-words text-sm font-semibold">
                        {record.student.firstName} {record.student.lastName}
                      </p>
                      <p className="break-all font-mono text-xs text-muted-foreground">
                        {record.student.studentId}
                      </p>
                    </div>
                  ) : null}
                  <p className="break-words text-base font-semibold leading-snug">
                    {classLabel}
                  </p>
                  {record.class.section ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Section {record.class.section}
                    </p>
                  ) : null}
                  {record.sessionTitle ? (
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {record.sessionTitle}
                    </p>
                  ) : null}
                </div>
                <Badge
                  variant={statusBadge.variant as any}
                  className="shrink-0 whitespace-nowrap"
                >
                  {statusBadge.label}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <MobileAttendanceRow
                  label="Date"
                  value={formatSessionDate(record.date)}
                />
                <MobileAttendanceRow label="Time" value={sessionTime} />
                {record.joinTime ? (
                  <MobileAttendanceRow
                    label="Joined"
                    value={formatSessionTime(record.joinTime)}
                  />
                ) : null}
                {lateMinutes > 0 ? (
                  <MobileAttendanceRow
                    label="Late"
                    value={`${lateMinutes} minute${lateMinutes === 1 ? "" : "s"}`}
                  />
                ) : null}
                {record.markedBy ? (
                  <MobileAttendanceRow
                    label="Teacher"
                    value={`${record.markedBy.firstName} ${record.markedBy.lastName}`}
                  />
                ) : showMarkedBy ? (
                  <MobileAttendanceRow label="Teacher" value="Not marked" />
                ) : null}
                {record.notes ? (
                  <MobileAttendanceRow label="Notes" value={record.notes} />
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {showStudent ? <TableHead>Student</TableHead> : null}
              <TableHead>Date</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Status</TableHead>
              {showJoinDetails ? <TableHead>Join Details</TableHead> : null}
              {showMarkedBy ? <TableHead>Marked By</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const statusBadge = getAttendanceStatusBadge(record.status)

              return (
                <TableRow key={record.id}>
                  {showStudent ? (
                    <TableCell>
                      {record.student ? (
                        <div>
                          <p className="font-medium">
                            {record.student.firstName} {record.student.lastName}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {record.student.studentId}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {formatSessionDate(record.date)}
                      </p>
                      {record.sessionTitle ? (
                        <p className="text-xs text-muted-foreground">
                          {record.sessionTitle}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {record.class.course.code}: {record.class.name}
                      </p>
                      {record.class.section ? (
                        <p className="text-xs text-muted-foreground">
                          Section {record.class.section}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadge.variant as any}>
                      {statusBadge.label}
                    </Badge>
                  </TableCell>
                  {showJoinDetails ? (
                    <TableCell>
                      {record.joinTime ? (
                        <div>
                          <p className="text-sm font-medium">
                            {formatSessionTime(record.joinTime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(record.lateMinutes || 0) > 0
                              ? `${record.lateMinutes} minute${record.lateMinutes === 1 ? "" : "s"} late`
                              : "On time"}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  ) : null}
                  {showMarkedBy ? (
                    <TableCell>
                      {record.markedBy ? (
                        `${record.markedBy.firstName} ${record.markedBy.lastName}`
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function getSessionTimeLabel(record: AttendanceRecordListItem) {
  if (record.sessionStartTime && record.sessionEndTime) {
    return `${formatSessionTime(record.sessionStartTime)} - ${formatSessionTime(
      record.sessionEndTime
    )}`
  }

  if (record.joinTime) {
    return `Joined ${formatSessionTime(record.joinTime)}`
  }

  return "Not recorded"
}

function MobileAttendanceRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 rounded-lg bg-muted/30 px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 break-words text-right font-medium text-foreground">
        {value}
      </span>
    </div>
  )
}
