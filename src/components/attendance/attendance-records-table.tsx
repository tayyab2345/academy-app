"use client"

import { getAttendanceStatusBadge } from "@/lib/attendance-utils"
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
      <div className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
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
                      {new Date(record.date).toLocaleDateString()}
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
                          {new Date(record.joinTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
  )
}
