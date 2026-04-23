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
  Card,
  CardContent,
} from "@/components/ui/card"
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

  const renderJoinAction = (session: Session) => {
    const sessionData = {
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime),
      status: session.status,
    }
    const joinWindow = getSessionJoinWindowState(sessionData)
    const effectiveMeetingSettings = getEffectiveSessionMeetingSettings({
      sessionMeetingPlatform: session.meetingPlatform,
      sessionMeetingLink: session.meetingLink,
      classMeetingPlatform,
      classMeetingLink,
    })

    if (joinWindow.isVisible) {
      return (
        <TeacherJoinButton
          sessionId={session.id}
          sessionStatus={session.status}
          meetingPlatform={effectiveMeetingSettings.platform}
          meetingLink={effectiveMeetingSettings.link}
          initialJoin={session.teacherJoin}
          showMeta={false}
          align="start"
          className="w-full sm:w-auto"
        />
      )
    }

    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Join button appears {SESSION_JOIN_LEAD_MINUTES} minutes before start.
      </p>
    )
  }

  return (
    <>
      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Sessions will appear here automatically from the admin class schedule.
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {sessions.map((session) => {
              const sessionData = {
                startTime: new Date(session.startTime),
                endTime: new Date(session.endTime),
                status: session.status,
              }
              const statusBadge = getSessionStatusBadge(session.status)
              const active = isSessionActive(sessionData)

              return (
                <Card key={session.id} className="border-border/80 shadow-sm">
                  <CardContent className="space-y-4 p-4">
                    <div className="space-y-2">
                      <p className="text-base font-semibold leading-tight">
                        {session.title ||
                          `Session ${new Date(session.sessionDate).toLocaleDateString()}`}
                      </p>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>{formatSessionDate(new Date(session.sessionDate))}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>
                            {formatSessionTime(new Date(session.startTime))} -{" "}
                            {formatSessionTime(new Date(session.endTime))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {getPlatformBadge(session.meetingPlatform)}
                      </Badge>
                      <Badge variant={statusBadge.variant as any}>
                        {statusBadge.label}
                      </Badge>
                      {active ? <Badge variant="success">Live Now</Badge> : null}
                    </div>

                    <div className="rounded-md bg-muted/30 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {session._count.attendances} student
                          {session._count.attendances === 1 ? "" : "s"} attendance
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {renderJoinAction(session)}
                      <Link href={`/teacher/sessions/${session.id}`} className="block">
                        <Button variant="outline" className="w-full">
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="hidden rounded-md border md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Session</TableHead>
                    <TableHead className="min-w-[210px]">Date & Time</TableHead>
                    <TableHead className="min-w-[110px]">Platform</TableHead>
                    <TableHead className="min-w-[110px]">Attendance</TableHead>
                    <TableHead className="min-w-[140px]">Status</TableHead>
                    <TableHead className="min-w-[220px]">Join</TableHead>
                    <TableHead className="min-w-[120px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
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
                          <p className="font-medium">
                            {session.title ||
                              `Session ${new Date(session.sessionDate).toLocaleDateString()}`}
                          </p>
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
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={statusBadge.variant as any}>
                              {statusBadge.label}
                            </Badge>
                            {active ? <Badge variant="success">Live Now</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>{renderJoinAction(session)}</TableCell>
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
                  })}
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
