"use client"

import {
  formatSessionDate,
  formatSessionTime,
  getSessionJoinStatusBadge,
} from "@/lib/attendance-utils"
import { Badge } from "@/components/ui/badge"
import { TeacherJoinButton } from "@/components/teacher/sessions/teacher-join-button"

interface TeacherJoinRecord {
  joinTime: string
  status: "on_time" | "late"
  lateMinutes: number
}

interface TeacherJoinSessionCardProps {
  sessionId: string
  sessionStatus: string
  meetingPlatform: string
  meetingLink: string | null
  initialJoin: TeacherJoinRecord | null
  sessionStartTime?: string | null
  sessionEndTime?: string | null
  academyTimeZone?: string | null
  joinWindowVisible?: boolean
  joinWindowMessage?: string
}

export function TeacherJoinSessionCard({
  sessionId,
  sessionStatus,
  meetingPlatform,
  meetingLink,
  initialJoin,
  sessionStartTime = null,
  sessionEndTime = null,
  academyTimeZone = null,
  joinWindowVisible = true,
  joinWindowMessage,
}: TeacherJoinSessionCardProps) {
  const statusBadge = initialJoin
    ? getSessionJoinStatusBadge(initialJoin.status)
    : null

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">Teacher Join Tracking</p>
            {statusBadge ? (
              <Badge variant={statusBadge.variant as any}>
                {statusBadge.label}
              </Badge>
            ) : null}
          </div>

          {initialJoin ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Joined at{" "}
                <span className="font-medium text-foreground">
                  {formatSessionDate(initialJoin.joinTime)} at{" "}
                  {formatSessionTime(initialJoin.joinTime)}
                </span>
              </p>
              <p>
                {initialJoin.status === "late"
                  ? `${initialJoin.lateMinutes} minute${initialJoin.lateMinutes === 1 ? "" : "s"} late`
                  : "Joined on time"}
              </p>
            </div>
          ) : !joinWindowVisible ? (
            <p className="text-sm text-muted-foreground">
              {joinWindowMessage ||
                "Join button appears shortly before the scheduled class time."}
            </p>
          ) : meetingPlatform !== "in_person" && !meetingLink ? (
            <p className="text-sm text-muted-foreground">
              Add a meeting link before teachers can join this online session.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Join this session to record your first join time and late status.
            </p>
          )}
        </div>

        {joinWindowVisible || initialJoin || (sessionStartTime && sessionEndTime) ? (
          <TeacherJoinButton
            sessionId={sessionId}
            sessionStatus={sessionStatus}
            meetingPlatform={meetingPlatform}
            meetingLink={meetingLink}
            initialJoin={initialJoin}
            sessionStartTime={sessionStartTime}
            sessionEndTime={sessionEndTime}
            academyTimeZone={academyTimeZone}
            showMeta={false}
          />
        ) : null}
      </div>
    </div>
  )
}
