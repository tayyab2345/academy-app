"use client"

import Link from "next/link"
import {
  Eye,
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
  formatSessionDate,
  formatSessionTime,
  getEffectiveSessionMeetingSettings,
  getSessionJoinWindowState,
  getSessionStatusBadge,
  SESSION_JOIN_LEAD_MINUTES,
  isSessionActive,
} from "@/lib/attendance-utils"
import { TeacherJoinButton } from "@/components/teacher/sessions/teacher-join-button"

interface Session {
  id: string
  title: string | null
  sessionDate: string
  startTime: string
  endTime: string
  meetingPlatform: string
  meetingLink: string | null
  status: string
  teacherJoin: {
    joinTime: string
    status: "on_time" | "late"
    lateMinutes: number
  } | null
  _count: {
    attendances: number
  }
}

interface SessionsTableProps {
  sessions: Session[]
  classMeetingPlatform: string
  classMeetingLink: string | null
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
}

export function SessionsTable({
  sessions,
  classMeetingPlatform,
  classMeetingLink,
  total,
  page,
  limit,
  onPageChange,
}: SessionsTableProps) {
  const totalPages = Math.ceil(total / limit)

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
              <TableHead>Join</TableHead>
              <TableHead className="w-[120px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Sessions will appear here automatically from the admin class
                  schedule.
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
                const joinWindow = getSessionJoinWindowState(sessionData)
                const effectiveMeetingSettings = getEffectiveSessionMeetingSettings({
                  sessionMeetingPlatform: session.meetingPlatform,
                  sessionMeetingLink: session.meetingLink,
                  classMeetingPlatform,
                  classMeetingLink,
                })

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
                      {joinWindow.isVisible ? (
                        <TeacherJoinButton
                          sessionId={session.id}
                          sessionStatus={session.status}
                          meetingPlatform={effectiveMeetingSettings.platform}
                          meetingLink={effectiveMeetingSettings.link}
                          initialJoin={session.teacherJoin}
                          showMeta={false}
                          align="start"
                          className="w-full min-w-[140px]"
                        />
                      ) : (
                        <p className="max-w-[180px] text-xs text-muted-foreground">
                          Join button appears {SESSION_JOIN_LEAD_MINUTES} minutes before start.
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/teacher/sessions/${session.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>
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
    </>
  )
}
