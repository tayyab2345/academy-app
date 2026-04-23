"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Video,
} from "lucide-react"
import { getSessionJoinStatusBadge } from "@/lib/attendance-utils"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface TeacherJoinRecord {
  joinTime: string
  status: "on_time" | "late"
  lateMinutes: number
}

interface TeacherJoinButtonProps {
  sessionId: string
  sessionStatus: string
  meetingPlatform: string
  meetingLink: string | null
  initialJoin: TeacherJoinRecord | null
  className?: string
  showMeta?: boolean
  align?: "start" | "end"
}

export function TeacherJoinButton({
  sessionId,
  sessionStatus,
  meetingPlatform,
  meetingLink,
  initialJoin,
  className,
  showMeta = true,
  align = "end",
}: TeacherJoinButtonProps) {
  const router = useRouter()
  const [teacherJoin, setTeacherJoin] = useState<TeacherJoinRecord | null>(
    initialJoin
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTeacherJoin(initialJoin)
  }, [initialJoin])

  const canJoin =
    sessionStatus === "scheduled" || sessionStatus === "ongoing"
  const statusBadge = teacherJoin
    ? getSessionJoinStatusBadge(teacherJoin.status)
    : null

  const openMeeting = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleJoin = async () => {
    if (!canJoin) {
      return
    }

    if (teacherJoin && meetingLink && meetingPlatform !== "in_person") {
      openMeeting(meetingLink)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/teacher/sessions/${sessionId}/join`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to join class")
      }

      const resolvedMeetingPlatform = data.meetingPlatform || meetingPlatform
      const nextJoin = data.teacherJoin
        ? {
            joinTime: new Date(data.teacherJoin.joinTime).toISOString(),
            status: data.teacherJoin.status as "on_time" | "late",
            lateMinutes: Number(data.teacherJoin.lateMinutes || 0),
          }
        : null

      setTeacherJoin(nextJoin)

      if (data.meetingLink && resolvedMeetingPlatform !== "in_person") {
        openMeeting(data.meetingLink)
      }

      router.refresh()
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Failed to join class"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "start" ? "items-start text-left" : "items-stretch sm:items-end sm:text-right",
        className
      )}
    >
      <Button
        type="button"
        onClick={handleJoin}
        disabled={
          isLoading ||
          !canJoin ||
          (meetingPlatform !== "in_person" && !meetingLink) ||
          (meetingPlatform === "in_person" && !!teacherJoin)
        }
        className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : teacherJoin ? (
          meetingPlatform === "in_person" ? (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          ) : (
            <ExternalLink className="mr-2 h-4 w-4" />
          )
        ) : meetingPlatform === "in_person" ? (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        ) : (
          <Video className="mr-2 h-4 w-4" />
        )}
        {teacherJoin
          ? meetingPlatform === "in_person"
            ? "Joined"
            : "Open Class"
          : meetingPlatform === "in_person"
            ? "Mark Joined"
            : "Join Class"}
      </Button>

      {showMeta && teacherJoin ? (
        <div className="space-y-1">
          {statusBadge ? (
            <Badge variant={statusBadge.variant as any}>{statusBadge.label}</Badge>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Joined {new Date(teacherJoin.joinTime).toLocaleString()}
          </p>
          {teacherJoin.status === "late" ? (
            <p className="text-xs text-amber-600">
              {teacherJoin.lateMinutes} minute{teacherJoin.lateMinutes === 1 ? "" : "s"} late
            </p>
          ) : (
            <p className="text-xs text-emerald-600">Joined on time</p>
          )}
        </div>
      ) : null}

      {showMeta && !teacherJoin && !canJoin ? (
        <p className="text-xs text-muted-foreground">
          Joining is available for scheduled or ongoing sessions.
        </p>
      ) : null}

      {showMeta && !teacherJoin && meetingPlatform !== "in_person" && !meetingLink ? (
        <p className="text-xs text-muted-foreground">
          Meeting link not available yet.
        </p>
      ) : null}

      {error ? (
        <p className="inline-flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
