import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { getTeacherClassesOverviewData } from "@/lib/teacher/teacher-class-data"
import { BookOpen, Users, Calendar } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"
import { TeacherJoinButton } from "@/components/teacher/sessions/teacher-join-button"
import {
  formatSessionDate,
  formatSessionTime,
  getEffectiveSessionMeetingSettings,
  getSessionJoinWindowState,
  SESSION_JOIN_LEAD_MINUTES,
} from "@/lib/attendance-utils"
import {
  formatSessionDayName,
  getJoinOpensMessage,
} from "@/lib/relevant-session"

export const metadata: Metadata = {
  title: "My Classes - Teacher - AcademyFlow",
  description: "View your assigned classes",
}

export default async function TeacherClassesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const classes = await getTeacherClassesOverviewData(session.user.id)

  if (!classes) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Classes</h2>
        <p className="text-muted-foreground">
          View and manage your assigned classes
        </p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No classes assigned</h3>
            <p className="text-muted-foreground">
              You haven&apos;t been assigned to any classes yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const nextSession = cls.nextSession
            const joinWindow = nextSession
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
                  classMeetingPlatform: cls.defaultMeetingPlatform,
                  classMeetingLink: cls.defaultMeetingLink,
                })
              : null

            return (
              <Card key={cls.id} className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{cls.name}</CardTitle>
                        <CardDescription>
                          {cls.course.code} - {cls.course.name}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          cls.role === "primary" ? "default" : "outline"
                        }
                      >
                        {cls.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <ClassScheduleSummary
                        scheduleDays={cls.scheduleDays}
                        scheduleStartTime={cls.scheduleStartTime}
                        scheduleEndTime={cls.scheduleEndTime}
                        scheduleRecurrence={cls.scheduleRecurrence}
                        emptyMessage="No recurring schedule has been configured yet."
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          Students
                        </span>
                        <span className="font-medium">{cls.studentCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Sessions
                        </span>
                        <span className="font-medium">{cls.sessionCount}</span>
                      </div>
                      {nextSession ? (
                        <div className="border-t pt-3">
                          <p className="mb-1 text-xs text-muted-foreground">
                            Today / Next Session
                          </p>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              {formatSessionDayName(nextSession.startTime)} -{" "}
                              {formatSessionDate(new Date(nextSession.startTime))}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatSessionTime(new Date(nextSession.startTime))} -{" "}
                              {formatSessionTime(new Date(nextSession.endTime))}
                            </p>
                            {effectiveMeetingSettings ? (
                              <TeacherJoinButton
                                sessionId={nextSession.id}
                                sessionStatus={nextSession.status}
                                meetingPlatform={effectiveMeetingSettings.platform}
                                meetingLink={effectiveMeetingSettings.link}
                                initialJoin={nextSession.teacherJoin}
                                disabledReason={
                                  joinWindow?.isVisible
                                    ? null
                                    : nextSession.status === "completed"
                                      ? "Today's class session has ended."
                                      : getJoinOpensMessage(SESSION_JOIN_LEAD_MINUTES)
                                }
                                disabledLabel={
                                  nextSession.status === "completed"
                                    ? "Session ended"
                                    : getJoinOpensMessage(SESSION_JOIN_LEAD_MINUTES)
                                }
                                align="start"
                                showMeta={false}
                                className="w-full"
                              />
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <Link href={`/teacher/classes/${cls.id}/sessions`}>
                        <Button variant="outline" className="w-full">
                          View Class
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
