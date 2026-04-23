import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { getAdminTeacherAssignmentOptions } from "@/lib/admin/admin-lists-data"
import { prisma } from "@/lib/prisma"
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  GraduationCap,
  MapPin,
  Pencil,
  Trash2,
  Users,
  Video,
} from "lucide-react"

import { AssignTeacherDialog } from "@/components/admin/classes/assign-teacher-dialog"
import { EnrollStudentsDialog } from "@/components/admin/classes/enroll-students-dialog"
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"
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
import { Separator } from "@/components/ui/separator"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
  formatLateThresholdLabel,
  getMeetingPlatformLabel,
} from "@/lib/attendance-utils"

interface ClassDetailPageProps {
  params: {
    classId: string
  }
}

async function fetchClass(classId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          gradeLevel: true,
          subjectArea: true,
        },
      },
      teachers: {
        include: {
          teacherProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          role: "asc",
        },
      },
      enrollments: {
        where: { status: "active" },
        include: {
          studentProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          studentProfile: {
            user: {
              firstName: "asc",
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: {
            where: { status: "active" },
          },
        },
      },
      sessions: {
        where: {
          endTime: {
            gte: new Date(),
          },
          status: {
            in: ["scheduled", "ongoing"],
          },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
          meetingPlatform: true,
          meetingLink: true,
          attendances: {
            where: {
              status: "late",
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
        take: 3,
      },
    },
  })

  if (!classData || classData.academyId !== session.user.academyId) {
    return null
  }

  return classData
}

export async function generateMetadata({
  params,
}: ClassDetailPageProps): Promise<Metadata> {
  const classData = await fetchClass(params.classId)

  if (!classData) {
    return { title: "Class Not Found" }
  }

  return {
    title: `${classData.name} - Classes - AcademyFlow`,
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>
    case "completed":
      return <Badge variant="secondary">Completed</Badge>
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export default async function ClassDetailPage({
  params,
}: ClassDetailPageProps) {
  const classData = await fetchClass(params.classId)

  if (!classData) {
    notFound()
  }

  const existingTeacherIds = classData.teachers.map(
    (teacher) => teacher.teacherProfile.id
  )
  const existingStudentIds = classData.enrollments.map(
    (enrollment) => enrollment.studentProfile.id
  )
  const teacherOptions = await getAdminTeacherAssignmentOptions(
    classData.academyId
  )

  async function removeTeacher(teacherProfileId: string) {
    "use server"

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return
    }

    const ownedClass = await prisma.class.findFirst({
      where: {
        id: params.classId,
        academyId: session.user.academyId,
      },
      select: { id: true },
    })

    if (!ownedClass) {
      return
    }

    await prisma.classTeacher.delete({
      where: {
        classId_teacherProfileId: {
          classId: params.classId,
          teacherProfileId,
        },
      },
    })

    revalidatePath(`/admin/classes/${params.classId}`)
    revalidatePath("/admin/classes")
  }

  async function removeStudent(studentProfileId: string) {
    "use server"

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return
    }

    const ownedClass = await prisma.class.findFirst({
      where: {
        id: params.classId,
        academyId: session.user.academyId,
      },
      select: { id: true },
    })

    if (!ownedClass) {
      return
    }

    await prisma.enrollment.update({
      where: {
        studentProfileId_classId: {
          classId: params.classId,
          studentProfileId,
        },
      },
      data: {
        status: "dropped",
      },
    })

    revalidatePath(`/admin/classes/${params.classId}`)
    revalidatePath("/admin/classes")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Link href="/admin/classes">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="break-words text-2xl font-bold tracking-tight">
                {classData.name}
              </h2>
              {classData.section ? (
                <Badge variant="outline">Section {classData.section}</Badge>
              ) : null}
              {getStatusBadge(classData.status)}
            </div>
            <p className="break-words text-muted-foreground">
              {classData.course.code} - {classData.course.name}
            </p>
          </div>
        </div>
        <Link href={`/admin/classes/${params.classId}/edit`}>
          <Button variant="outline" className="w-full sm:w-auto">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Class
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Course
                </p>
                <p className="break-words font-medium">{classData.course.name}</p>
                <p className="break-words text-sm text-muted-foreground">
                  {classData.course.subjectArea} - {classData.course.gradeLevel}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Academic Year
                </p>
                <p>{classData.academicYear}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Start Date
                  </p>
                  <p>{new Date(classData.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    End Date
                  </p>
                  <p>{new Date(classData.endDate).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Recurring Schedule
              </CardTitle>
              <CardDescription>
                Weekly timetable shown to teachers, students, and parents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClassScheduleSummary
                scheduleDays={classData.scheduleDays}
                scheduleStartTime={classData.scheduleStartTime}
                scheduleEndTime={classData.scheduleEndTime}
                scheduleRecurrence={classData.scheduleRecurrence}
                variant="detailed"
                emptyMessage="No recurring schedule has been configured for this class yet."
              />

              {classData.sessions.length > 0 ? (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Upcoming scheduled sessions
                  </p>
                  <div className="space-y-2">
                    {classData.sessions.map((sessionItem) => (
                      <div key={sessionItem.id} className="rounded-md border px-3 py-3">
                        <p className="text-sm font-medium">
                          {sessionItem.title || "Class Session"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sessionItem.startTime).toLocaleDateString()} at{" "}
                          {new Date(sessionItem.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(sessionItem.endTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            {sessionItem.meetingPlatform === "in_person" ? (
                              <MapPin className="h-3 w-3" />
                            ) : (
                              <Video className="h-3 w-3" />
                            )}
                            {getMeetingPlatformLabel(sessionItem.meetingPlatform)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {sessionItem.attendances.length} late join
                            {sessionItem.attendances.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        {sessionItem.meetingLink ? (
                          <div className="mt-3">
                            <MeetingLinkButton
                              href={sessionItem.meetingLink}
                              label="Open Meeting Link"
                              className="sm:h-9"
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Online Setup & Attendance Rules
              </CardTitle>
              <CardDescription>
                Defaults applied at the class level by admin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Default meeting platform
                </p>
                <p>{getMeetingPlatformLabel(classData.defaultMeetingPlatform)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Late join rule
                </p>
                <p>{formatLateThresholdLabel(classData.lateThresholdMinutes)}</p>
              </div>
              {classData.defaultMeetingPlatform !== "in_person" ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Default class meeting link
                  </p>
                  {classData.defaultMeetingLink ? (
                    <div className="pt-2">
                      <MeetingLinkButton
                        href={classData.defaultMeetingLink}
                        label="Open Meeting Link"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No default class meeting link has been added yet.
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
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Students Enrolled
                </span>
                <span className="text-2xl font-bold">
                  {classData._count.enrollments}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Teachers Assigned
                </span>
                <span className="text-2xl font-bold">
                  {classData.teachers.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Teachers
                </CardTitle>
                <CardDescription>
                  Teachers assigned to this class
                </CardDescription>
              </div>
              <AssignTeacherDialog
                classId={params.classId}
                existingTeacherIds={existingTeacherIds}
                teacherOptions={teacherOptions}
              />
            </CardHeader>
            <CardContent>
              {classData.teachers.length === 0 ? (
                <div className="py-6 text-center">
                  <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No teachers assigned yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {classData.teachers.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          firstName={assignment.teacherProfile.user.firstName}
                          lastName={assignment.teacherProfile.user.lastName}
                          avatarUrl={assignment.teacherProfile.user.avatarUrl}
                          className="h-10 w-10"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words font-medium">
                              {assignment.teacherProfile.user.firstName}{" "}
                              {assignment.teacherProfile.user.lastName}
                            </p>
                            <Badge
                              variant={
                                assignment.role === "primary"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {assignment.role === "primary"
                                ? "Primary"
                                : "Assistant"}
                            </Badge>
                          </div>
                          <p className="break-all text-sm text-muted-foreground">
                            {assignment.teacherProfile.user.email}
                          </p>
                        </div>
                      </div>
                      <form
                        action={async () => {
                          "use server"
                          await removeTeacher(assignment.teacherProfile.id)
                        }}
                      >
                        <Button variant="ghost" size="icon" type="submit">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Enrolled Students
                </CardTitle>
                <CardDescription>
                  {classData._count.enrollments} student
                  {classData._count.enrollments !== 1 ? "s" : ""} enrolled
                </CardDescription>
              </div>
              <EnrollStudentsDialog
                classId={params.classId}
                courseGradeLevel={classData.course.gradeLevel}
                existingStudentIds={existingStudentIds}
              />
            </CardHeader>
            <CardContent>
              {classData.enrollments.length === 0 ? (
                <div className="py-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No students enrolled yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {classData.enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          firstName={enrollment.studentProfile.user.firstName}
                          lastName={enrollment.studentProfile.user.lastName}
                          avatarUrl={enrollment.studentProfile.user.avatarUrl}
                          className="h-10 w-10"
                        />
                        <div className="min-w-0">
                          <p className="break-words font-medium">
                            {enrollment.studentProfile.user.firstName}{" "}
                            {enrollment.studentProfile.user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {enrollment.studentProfile.studentId}
                          </p>
                        </div>
                      </div>
                      <form
                        action={async () => {
                          "use server"
                          await removeStudent(enrollment.studentProfile.id)
                        }}
                      >
                        <Button variant="ghost" size="icon" type="submit">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
