"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Video,
} from "lucide-react"
import { getSessionJoinStatusBadge } from "@/lib/attendance-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
}

export function TeacherJoinSessionCard({
  sessionId,
  sessionStatus,
  meetingPlatform,
  meetingLink,
  initialJoin,
}: TeacherJoinSessionCardProps) {
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

      const nextJoin = data.teacherJoin
        ? {
            joinTime: new Date(data.teacherJoin.joinTime).toISOString(),
            status: data.teacherJoin.status as "on_time" | "late",
            lateMinutes: Number(data.teacherJoin.lateMinutes || 0),
          }
        : null

      setTeacherJoin(nextJoin)

      if (data.meetingLink && meetingPlatform !== "in_person") {
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

          {teacherJoin ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Joined at{" "}
                <span className="font-medium text-foreground">
                  {new Date(teacherJoin.joinTime).toLocaleString()}
                </span>
              </p>
              <p>
                {teacherJoin.status === "late"
                  ? `${teacherJoin.lateMinutes} minute${teacherJoin.lateMinutes === 1 ? "" : "s"} late`
                  : "Joined on time"}
              </p>
            </div>
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

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button
            type="button"
            onClick={handleJoin}
            disabled={
              isLoading ||
              !canJoin ||
              (meetingPlatform !== "in_person" && !meetingLink) ||
              (meetingPlatform === "in_person" && !!teacherJoin)
            }
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : teacherJoin ? (
              <ExternalLink className="mr-2 h-4 w-4" />
            ) : meetingPlatform === "in_person" ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <Video className="mr-2 h-4 w-4" />
            )}
            {teacherJoin
              ? meetingPlatform === "in_person"
                ? "Joined"
                : "Reopen Meeting"
              : meetingPlatform === "in_person"
                ? "Mark Joined"
                : "Join Class"}
          </Button>
          {!canJoin ? (
            <p className="text-xs text-muted-foreground">
              Joining is available for scheduled or ongoing sessions.
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Unable to join session</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
