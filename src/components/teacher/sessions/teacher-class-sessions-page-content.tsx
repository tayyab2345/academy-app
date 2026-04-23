"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import type { TeacherClassSessionListItem } from "@/lib/teacher/teacher-class-data"
import {
  formatLateThresholdLabel,
  getEffectiveSessionMeetingSettings,
  getMeetingPlatformLabel,
  getSessionJoinWindowState,
  SESSION_JOIN_LEAD_MINUTES,
} from "@/lib/attendance-utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SessionsTable } from "@/components/teacher/sessions/sessions-table"
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"
import { CourseSyllabusPanel } from "@/components/courses/course-syllabus-panel"
import { TeacherJoinButton } from "@/components/teacher/sessions/teacher-join-button"
import { MeetingLinkButton } from "@/components/sessions/meeting-link-button"

interface TeacherClassSessionsPageContentProps {
  classId: string
  classInfo: {
    name: string
    section: string | null
    scheduleDays: string[]
    scheduleStartTime: string | null
    scheduleEndTime: string | null
    scheduleRecurrence: string
    defaultMeetingPlatform: string
    defaultMeetingLink: string | null
    lateThresholdMinutes: number
    course: {
      code: string
      name: string
      syllabusPdfUrl: string | null
      syllabusImageUrl: string | null
    }
    nextSession: TeacherClassSessionListItem | null
  }
  sessions: TeacherClassSessionListItem[]
  total: number
  page: number
  limit: number
}

export function TeacherClassSessionsPageContent({
  classId,
  classInfo,
  sessions,
  total,
  page,
  limit,
}: TeacherClassSessionsPageContentProps) {
  const router = useRouter()
  const baseUrl = `/teacher/classes/${classId}/sessions`
  const nextSession = classInfo.nextSession
  const nextSessionJoinWindow = nextSession
    ? getSessionJoinWindowState({
        startTime: nextSession.startTime,
        endTime: nextSession.endTime,
        status: nextSession.status,
      })
    : null
  const effectiveMeetingSettings = nextSession
    ? getEffectiveSessionMeetingSettings({
        sessionMeetingPlatform: nextSession.meetingPlatform,
        sessionMeetingLink: nextSession.meetingLink,
        classMeetingPlatform: classInfo.defaultMeetingPlatform,
        classMeetingLink: classInfo.defaultMeetingLink,
      })
    : null

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams()
    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())
    router.push(`${baseUrl}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teacher/classes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {classInfo.name}
            </h2>
            <p className="text-muted-foreground">
              {classInfo.course.code} - {classInfo.course.name}
              {classInfo.section ? ` (Section ${classInfo.section})` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Class Information</CardTitle>
            <CardDescription>
              Admin-configured meeting setup and attendance rule for this class
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Course</p>
              <p className="break-words">{classInfo.course.name}</p>
              <p className="break-words text-sm text-muted-foreground">
                {classInfo.course.code} - {classInfo.name}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Weekly Schedule
              </p>
              <ClassScheduleSummary
                scheduleDays={classInfo.scheduleDays}
                scheduleStartTime={classInfo.scheduleStartTime}
                scheduleEndTime={classInfo.scheduleEndTime}
                scheduleRecurrence={classInfo.scheduleRecurrence}
                variant="detailed"
                emptyMessage="No recurring schedule has been configured for this class yet."
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Attendance Rule
              </p>
              <p className="text-sm">
                {formatLateThresholdLabel(classInfo.lateThresholdMinutes)}
              </p>
            </div>
            {classInfo.defaultMeetingPlatform !== "in_person" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Default Online Class Link
                </p>
                <p className="text-sm">
                  {getMeetingPlatformLabel(classInfo.defaultMeetingPlatform)}
                </p>
                {nextSession && effectiveMeetingSettings ? (
                  nextSessionJoinWindow?.isVisible ? (
                    <TeacherJoinButton
                      sessionId={nextSession.id}
                      sessionStatus={nextSession.status}
                      meetingPlatform={effectiveMeetingSettings.platform}
                      meetingLink={effectiveMeetingSettings.link}
                      initialJoin={nextSession.teacherJoin}
                      align="start"
                    />
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Next session:{" "}
                        {new Date(nextSession.startTime).toLocaleDateString()} at{" "}
                        {new Date(nextSession.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Teacher join tracking button appears{" "}
                        {SESSION_JOIN_LEAD_MINUTES} minutes before class time.
                      </p>
                    </div>
                  )
                ) : classInfo.defaultMeetingLink ? (
                  <div className="space-y-2">
                    <MeetingLinkButton href={classInfo.defaultMeetingLink} />
                    <p className="text-xs text-muted-foreground">
                      Sessions are generated automatically from the admin class
                      schedule.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Admin has not added the class meeting link yet.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This class is currently configured for in-person teaching.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recurring Schedule</CardTitle>
            <CardDescription>
              Weekly timetable generated from admin class setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClassScheduleSummary
              scheduleDays={classInfo.scheduleDays}
              scheduleStartTime={classInfo.scheduleStartTime}
              scheduleEndTime={classInfo.scheduleEndTime}
              scheduleRecurrence={classInfo.scheduleRecurrence}
              variant="detailed"
              emptyMessage="No recurring schedule has been configured for this class yet."
            />
          </CardContent>
        </Card>
      </div>

      <CourseSyllabusPanel
        courseName={classInfo.course.name}
        syllabusPdfUrl={classInfo.course.syllabusPdfUrl}
        syllabusImageUrl={classInfo.course.syllabusImageUrl}
        emptyMessage="No syllabus uploaded for this course yet."
      />

      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
          <CardDescription>
            {total} session{total !== 1 ? "s" : ""} synced from the admin class
            schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsTable
            sessions={sessions}
            classMeetingPlatform={classInfo.defaultMeetingPlatform}
            classMeetingLink={classInfo.defaultMeetingLink}
            total={total}
            page={page}
            limit={limit}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>
    </div>
  )
}
