import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
} from "lucide-react"

import { JoinSessionButton } from "@/components/student/join-session-button"
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"
import { CourseSyllabusPanel } from "@/components/courses/course-syllabus-panel"
import { MeetingLinkButton } from "@/components/sessions/meeting-link-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatLateThresholdLabel,
  getEffectiveSessionMeetingSettings,
  getMeetingPlatformLabel,
} from "@/lib/attendance-utils"

interface ClassDetailPageProps {
  params: {
    classId: string
  }
}

async function fetchClassData(classId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    return null
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!studentProfile) {
    return null
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentProfileId_classId: {
        studentProfileId: studentProfile.id,
        classId,
      },
    },
  })

  if (!enrollment || enrollment.status !== "active") {
    return null
  }

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      course: {
        select: {
          code: true,
          name: true,
          subjectArea: true,
          description: true,
          syllabusPdfUrl: true,
          syllabusImageUrl: true,
        },
      },
      teachers: {
        include: {
          teacherProfile: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          role: "asc",
        },
      },
      sessions: {
        where: {
          status: { in: ["scheduled", "ongoing", "completed"] },
        },
        include: {
          attendances: {
            where: {
              studentProfileId: studentProfile.id,
            },
            select: {
              id: true,
              status: true,
              joinTime: true,
              lateMinutes: true,
            },
          },
        },
        orderBy: {
          startTime: "desc",
        },
      },
    },
  })

  if (!classData) {
    return null
  }

  return classData
}

export async function generateMetadata({
  params,
}: ClassDetailPageProps): Promise<Metadata> {
  const classData = await fetchClassData(params.classId)

  if (!classData) {
    return { title: "Class Not Found" }
  }

  return {
    title: `${classData.name} - Student - AcademyFlow`,
  }
}

export default async function StudentClassDetailPage({
  params,
}: ClassDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/login")
  }

  const classData = await fetchClassData(params.classId)

  if (!classData) {
    notFound()
  }

  const upcomingSessions = classData.sessions.filter(
    (sessionItem) =>
      sessionItem.status === "scheduled" || sessionItem.status === "ongoing"
  )
  const pastSessions = classData.sessions.filter(
    (sessionItem) => sessionItem.status === "completed"
  )

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 items-start gap-4">
        <Link href="/student/classes">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-bold tracking-tight">
            {classData.name}
          </h2>
          <p className="break-words text-muted-foreground">
            {classData.course.code} - {classData.course.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Course</p>
                <p className="break-words">{classData.course.name}</p>
                <p className="break-words text-sm text-muted-foreground">
                  {classData.course.subjectArea}
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Weekly Schedule
                </p>
                <ClassScheduleSummary
                  scheduleDays={classData.scheduleDays}
                  scheduleStartTime={classData.scheduleStartTime}
                  scheduleEndTime={classData.scheduleEndTime}
                  scheduleRecurrence={classData.scheduleRecurrence}
                  teacherName={
                    classData.teachers[0]
                      ? `${classData.teachers[0].teacherProfile.user.firstName} ${classData.teachers[0].teacherProfile.user.lastName}`
                      : null
                  }
                  variant="detailed"
                  emptyMessage="No recurring schedule has been configured for this class yet."
                />
              </div>
              {classData.course.description ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="text-sm">{classData.course.description}</p>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Attendance Rule
                </p>
                <p className="text-sm">
                  {formatLateThresholdLabel(classData.lateThresholdMinutes)}
                </p>
              </div>
              {classData.defaultMeetingPlatform !== "in_person" ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Default Online Class Link
                  </p>
                  <p className="text-sm">
                    {getMeetingPlatformLabel(classData.defaultMeetingPlatform)}
                  </p>
                  {classData.defaultMeetingLink ? (
                    <div className="pt-2">
                      <MeetingLinkButton href={classData.defaultMeetingLink} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Admin has not added the class meeting link yet.
                    </p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <CourseSyllabusPanel
            courseName={classData.course.name}
            syllabusPdfUrl={classData.course.syllabusPdfUrl}
            syllabusImageUrl={classData.course.syllabusImageUrl}
            emptyMessage="No syllabus uploaded for this course yet."
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classData.teachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No teachers assigned
                </p>
              ) : (
                <div className="space-y-3">
                  {classData.teachers.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {assignment.teacherProfile.user.firstName}{" "}
                          {assignment.teacherProfile.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.teacherProfile.user.email}
                        </p>
                      </div>
                      {assignment.role === "primary" ? (
                        <Badge variant="outline">Primary</Badge>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>
                Join your class sessions here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No upcoming sessions scheduled
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((sessionItem) => {
                    const studentAttendance = sessionItem.attendances[0] || null
                    const effectiveMeetingSettings = getEffectiveSessionMeetingSettings({
                      sessionMeetingPlatform: sessionItem.meetingPlatform,
                      sessionMeetingLink: sessionItem.meetingLink,
                      classMeetingPlatform: classData.defaultMeetingPlatform,
                      classMeetingLink: classData.defaultMeetingLink,
                    })
                    const joinStatus =
                      studentAttendance?.joinTime
                        ? (studentAttendance.lateMinutes || 0) > 0
                          ? "Late Join"
                          : "On Time"
                        : null

                    return (
                      <div
                        key={sessionItem.id}
                        className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">
                            {sessionItem.title || "Class Session"}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(sessionItem.startTime).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(sessionItem.startTime).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}{" "}
                              -{" "}
                              {new Date(sessionItem.endTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            {effectiveMeetingSettings.platform === "in_person" ? (
                              <MapPin className="h-3 w-3" />
                            ) : (
                              <Video className="h-3 w-3" />
                            )}
                            <span className="text-muted-foreground">
                              {getMeetingPlatformLabel(
                                effectiveMeetingSettings.platform
                              )}
                            </span>
                          </div>
                          {effectiveMeetingSettings.platform !== "in_person" &&
                          !effectiveMeetingSettings.link ? (
                            <p className="text-xs text-muted-foreground">
                              Meeting link has not been added yet.
                            </p>
                          ) : null}
                          {effectiveMeetingSettings.inheritedFromClass ? (
                            <p className="text-xs text-muted-foreground">
                              Using the class default meeting link.
                            </p>
                          ) : null}
                          {studentAttendance?.joinTime ? (
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>
                                Joined{" "}
                                {new Date(studentAttendance.joinTime).toLocaleString()}
                              </p>
                              <p>
                                {joinStatus}
                                {(studentAttendance.lateMinutes || 0) > 0
                                  ? ` | ${studentAttendance.lateMinutes} minute${studentAttendance.lateMinutes === 1 ? "" : "s"} late`
                                  : ""}
                              </p>
                            </div>
                          ) : null}
                        </div>
                        <JoinSessionButton
                          sessionId={sessionItem.id}
                          sessionStatus={sessionItem.status}
                          meetingPlatform={effectiveMeetingSettings.platform}
                          meetingLink={effectiveMeetingSettings.link}
                          initialAttendance={
                            studentAttendance
                              ? {
                                  joinTime: studentAttendance.joinTime
                                    ? studentAttendance.joinTime.toISOString()
                                    : null,
                                  lateMinutes: studentAttendance.lateMinutes,
                                }
                              : null
                          }
                          align="start"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {pastSessions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Past Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pastSessions.slice(0, 5).map((sessionItem) => (
                    <div
                      key={sessionItem.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {sessionItem.title || "Class Session"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sessionItem.startTime).toLocaleDateString()} at{" "}
                          {new Date(sessionItem.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {sessionItem.attendances[0]?.joinTime ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Joined{" "}
                            {new Date(
                              sessionItem.attendances[0].joinTime
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {(sessionItem.attendances[0].lateMinutes || 0) > 0
                              ? ` | ${sessionItem.attendances[0].lateMinutes} minute${sessionItem.attendances[0].lateMinutes === 1 ? "" : "s"} late`
                              : " | on time"}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
