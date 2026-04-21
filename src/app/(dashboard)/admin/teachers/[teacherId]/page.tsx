import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Calendar,
  Award,
  BookOpen,
  Clock,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserAvatar } from "@/components/ui/user-avatar"

interface TeacherDetailPageProps {
  params: {
    teacherId: string
  }
}

export async function generateMetadata({
  params,
}: TeacherDetailPageProps): Promise<Metadata> {
  const teacher = await fetchTeacherMetadata(params.teacherId)

  if (!teacher) {
    return {
      title: "Teacher Not Found",
    }
  }

  return {
    title: `${teacher.user.firstName} ${teacher.user.lastName} - Teachers - AcademyFlow`,
    description: `Teacher profile for ${teacher.user.firstName} ${teacher.user.lastName}`,
  }
}

async function fetchTeacherMetadata(teacherId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: {
      user: {
        select: {
          academyId: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (!teacher || teacher.user.academyId !== session.user.academyId) {
    return null
  }

  return teacher
}

async function fetchTeacher(teacherId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      user: {
        select: {
          id: true,
          academyId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          isAcademyOwner: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  })

  if (!teacher || teacher.user.academyId !== session.user.academyId) {
    return null
  }

  const [classAssignments, todaySessions, upcomingSessions] = await Promise.all([
    prisma.classTeacher.findMany({
      where: {
        teacherProfileId: teacher.id,
        class: {
          academyId: session.user.academyId,
        },
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            name: true,
            section: true,
            academicYear: true,
            status: true,
            course: {
              select: {
                code: true,
                name: true,
              },
            },
            _count: {
              select: {
                enrollments: {
                  where: {
                    status: "active",
                  },
                },
                sessions: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.classSession.findMany({
      where: {
        class: {
          academyId: session.user.academyId,
          teachers: {
            some: {
              teacherProfileId: teacher.id,
            },
          },
        },
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        class: {
          select: {
            id: true,
            name: true,
            section: true,
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
      take: 5,
    }),
    prisma.classSession.findMany({
      where: {
        class: {
          academyId: session.user.academyId,
          teachers: {
            some: {
              teacherProfileId: teacher.id,
            },
          },
        },
        startTime: {
          gt: endOfDay,
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
        class: {
          select: {
            id: true,
            name: true,
            section: true,
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
      take: 5,
    }),
  ])

  return {
    ...teacher,
    classAssignments: classAssignments.sort((left, right) =>
      left.class.name.localeCompare(right.class.name)
    ),
    todaySessions,
    upcomingSessions,
  }
}

function getClassStatusBadgeVariant(status: string) {
  switch (status) {
    case "active":
      return "success"
    case "completed":
      return "secondary"
    case "cancelled":
      return "destructive"
    default:
      return "outline"
  }
}

function formatSessionDateTime(startTime: Date, endTime: Date) {
  return `${startTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${startTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${endTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

export default async function TeacherDetailPage({
  params,
}: TeacherDetailPageProps) {
  const teacher = await fetchTeacher(params.teacherId)

  if (!teacher) {
    notFound()
  }

  const assignedClassesCount = teacher.classAssignments.length
  const activeClassesCount = teacher.classAssignments.filter(
    (assignment) => assignment.class.status === "active"
  ).length
  const totalStudents = teacher.classAssignments.reduce(
    (sum, assignment) => sum + assignment.class._count.enrollments,
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/teachers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Teacher Profile
            </h2>
            <p className="text-muted-foreground">
              View teacher details and information
            </p>
          </div>
        </div>
        <Link href={`/admin/teachers/${params.teacherId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Teacher
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <UserAvatar
                  firstName={teacher.user.firstName}
                  lastName={teacher.user.lastName}
                  avatarUrl={teacher.user.avatarUrl}
                  className="h-24 w-24"
                  fallbackClassName="bg-primary/10 text-2xl text-primary"
                  iconClassName="h-10 w-10"
                />
                <h3 className="mt-4 text-xl font-semibold">
                  {teacher.user.firstName} {teacher.user.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {teacher.employeeId || "No Employee ID"}
                </p>
                <div className="mt-2">
                  <Badge variant={teacher.user.isActive ? "success" : "secondary"}>
                    {teacher.user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{teacher.user.email}</span>
              </div>
              {teacher.user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{teacher.user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Joined {new Date(teacher.joiningDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Qualification
                  </p>
                  <p className="mt-1">
                    {teacher.qualification || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Specialization
                  </p>
                  <p className="mt-1">
                    {teacher.specialization || "Not specified"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Max Weekly Hours
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {teacher.maxWeeklyHours || "-"}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Award className="h-4 w-4" />
                    Employee Since
                  </p>
                  <p className="mt-1">
                    {new Date(teacher.joiningDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {teacher.bio && (
            <Card>
              <CardHeader>
                <CardTitle>Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {teacher.bio}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Account Created</span>
                <span className="text-sm">
                  {new Date(teacher.user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-sm">
                  {new Date(teacher.user.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Academy Owner</span>
                <Badge variant={teacher.user.isAcademyOwner ? "default" : "outline"}>
                  {teacher.user.isAcademyOwner ? "Yes" : "No"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Classes & Schedule
              </CardTitle>
              <CardDescription>
                Assigned classes, student counts, and upcoming teaching sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedClassesCount === 0 ? (
                <div className="rounded-lg border border-dashed px-6 py-10 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">No classes assigned</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This teacher has not been assigned to any classes yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Assigned Classes
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {assignedClassesCount}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Active Classes
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {activeClassesCount}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Enrolled Students
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {totalStudents}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Assigned Classes
                        </h3>
                      </div>
                      {teacher.classAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="rounded-lg border p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">
                                {assignment.class.name}
                                {assignment.class.section
                                  ? ` (Section ${assignment.class.section})`
                                  : ""}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {assignment.class.course.code} - {assignment.class.course.name}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant={
                                  getClassStatusBadgeVariant(assignment.class.status) as
                                    | "default"
                                    | "secondary"
                                    | "destructive"
                                    | "outline"
                                    | "success"
                                    | "warning"
                                }
                              >
                                {assignment.class.status}
                              </Badge>
                              <Badge variant="outline">{assignment.role}</Badge>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>
                                {assignment.class._count.enrollments} active student
                                {assignment.class._count.enrollments !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {assignment.class._count.sessions} session
                                {assignment.class._count.sessions !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{assignment.class.academicYear}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-lg border p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Today&apos;s Sessions
                        </h3>
                        {teacher.todaySessions.length === 0 ? (
                          <p className="mt-3 text-sm text-muted-foreground">
                            No sessions scheduled for today.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {teacher.todaySessions.map((session) => (
                              <div key={session.id} className="rounded-md bg-muted/20 p-3">
                                <p className="font-medium">
                                  {session.title || session.class.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {session.class.course.code}: {session.class.name}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {formatSessionDateTime(session.startTime, session.endTime)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Upcoming Sessions
                        </h3>
                        {teacher.upcomingSessions.length === 0 ? (
                          <p className="mt-3 text-sm text-muted-foreground">
                            No upcoming sessions scheduled yet.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {teacher.upcomingSessions.map((session) => (
                              <div key={session.id} className="rounded-md bg-muted/20 p-3">
                                <p className="font-medium">
                                  {session.title || session.class.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {session.class.course.code}: {session.class.name}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {formatSessionDateTime(session.startTime, session.endTime)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
