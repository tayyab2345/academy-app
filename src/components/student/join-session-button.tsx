"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { getSessionJoinStatusBadge } from "@/lib/attendance-utils"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface JoinSessionButtonProps {
  sessionId: string
  sessionStatus: string
  meetingPlatform: string
  meetingLink: string | null
  initialAttendance?: {
    joinTime: string | null
    lateMinutes: number | null
  } | null
  className?: string
  showMeta?: boolean
  align?: "start" | "end"
}

export function JoinSessionButton({
  sessionId,
  sessionStatus,
  meetingPlatform,
  meetingLink,
  initialAttendance = null,
  className,
  showMeta = true,
  align = "end",
}: JoinSessionButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [joinRecord, setJoinRecord] = useState(initialAttendance)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setJoinRecord(initialAttendance)
  }, [initialAttendance])

  const hasJoined = !!joinRecord?.joinTime
  const canJoin =
    sessionStatus === "scheduled" || sessionStatus === "ongoing"
  const joinStatus = useMemo(() => {
    if (!joinRecord?.joinTime) {
      return null
    }

    return (joinRecord.lateMinutes || 0) > 0 ? "late" : "on_time"
  }, [joinRecord])
  const joinBadge = joinStatus ? getSessionJoinStatusBadge(joinStatus) : null

  const handleJoin = async () => {
    if (!canJoin) {
      return
    }

    if (hasJoined && meetingLink && meetingPlatform !== "in_person") {
      window.open(meetingLink, "_blank", "noopener,noreferrer")
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/student/sessions/${sessionId}/join`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to join session")
      }

      const resolvedMeetingPlatform = data.meetingPlatform || meetingPlatform

      setJoinRecord({
        joinTime: data.attendance?.joinTime || new Date().toISOString(),
        lateMinutes: data.attendance?.lateMinutes ?? data.joinTracking?.lateMinutes ?? 0,
      })

      if (data.meetingLink && resolvedMeetingPlatform !== "in_person") {
        window.open(data.meetingLink, "_blank", "noopener,noreferrer")
      }

      router.refresh()
    } catch (error) {
      console.error("Failed to join session:", error)
      setError(
        error instanceof Error ? error.message : "Failed to join session"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "start"
          ? "items-start text-left"
          : "items-stretch sm:items-end sm:text-right",
        className
      )}
    >
      <Button
        onClick={handleJoin}
        disabled={
          isLoading ||
          !canJoin ||
          (meetingPlatform !== "in_person" && !meetingLink) ||
          (meetingPlatform === "in_person" && hasJoined)
        }
        variant={hasJoined ? "secondary" : "default"}
        className={cn(
          "w-full sm:w-auto",
          !hasJoined && "bg-emerald-600 text-white hover:bg-emerald-700"
        )}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : hasJoined ? (
          meetingPlatform === "in_person" ? (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          ) : (
            <ExternalLink className="mr-2 h-4 w-4" />
          )
        ) : meetingPlatform === "in_person" ? (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        ) : (
          <ExternalLink className="mr-2 h-4 w-4" />
        )}
        {hasJoined
          ? meetingPlatform === "in_person"
            ? "Attendance Recorded"
            : "Open Class"
          : meetingPlatform === "in_person"
            ? "Mark Attendance"
            : "Join Class"}
      </Button>

      {showMeta && joinRecord?.joinTime ? (
        <div
          className={cn(
            "space-y-1",
            align === "start" ? "text-left" : "text-right"
          )}
        >
          {joinBadge ? (
            <Badge variant={joinBadge.variant as any}>{joinBadge.label}</Badge>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Joined {new Date(joinRecord.joinTime).toLocaleString()}
          </p>
          {(joinRecord.lateMinutes || 0) > 0 ? (
            <p className="text-xs text-yellow-600">
              {joinRecord.lateMinutes} minute{joinRecord.lateMinutes === 1 ? "" : "s"} late
            </p>
          ) : (
            <p className="text-xs text-green-600">Joined on time</p>
          )}
        </div>
      ) : showMeta && !canJoin ? (
        <p className="text-xs text-muted-foreground">
          Join is available for scheduled or ongoing sessions.
        </p>
      ) : showMeta && meetingPlatform !== "in_person" && !meetingLink ? (
        <p className="text-xs text-muted-foreground">Meeting link not available yet.</p>
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
