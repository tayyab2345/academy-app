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
  Users,
  BookOpen,
  AlertCircle,
  User,
  GraduationCap,
  Shield,
  Car,
  FileText,
  ClipboardCheck,
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
import { LinkParentDialog } from "@/components/admin/students/link-parents-dialog"
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"
import { UserAvatar } from "@/components/ui/user-avatar"

interface StudentDetailPageProps {
  params: {
    studentId: string
  }
}

type AttendanceSummary = {
  present: number
  absent: number
  late: number
  excused: number
  total: number
}

async function fetchStudentMetadata(studentId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
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

  if (!student || student.user.academyId !== session.user.academyId) {
    return null
  }

  return student
}

async function fetchStudent(studentId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
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
          createdAt: true,
          updatedAt: true,
        },
      },
      parentLinks: {
        include: {
          parentProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!student || student.user.academyId !== session.user.academyId) {
    return null
  }

  const [enrollments, reportCount, latestReport, attendanceCounts] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        studentProfileId: student.id,
        class: {
          academyId: session.user.academyId,
        },
      },
      select: {
        id: true,
        status: true,
        enrolledAt: true,
        class: {
          select: {
            id: true,
            name: true,
            section: true,
            academicYear: true,
            status: true,
            scheduleDays: true,
            scheduleStartTime: true,
            scheduleEndTime: true,
            scheduleRecurrence: true,
            course: {
              select: {
                code: true,
                name: true,
              },
            },
            teachers: {
              select: {
                id: true,
                role: true,
                teacherProfile: {
                  select: {
                    id: true,
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: "desc",
      },
    }),
    prisma.report.count({
      where: {
        studentProfileId: student.id,
        class: {
          academyId: session.user.academyId,
        },
      },
    }),
    prisma.report.findFirst({
      where: {
        studentProfileId: student.id,
        class: {
          academyId: session.user.academyId,
        },
      },
      select: {
        id: true,
        reportType: true,
        reportDate: true,
        status: true,
        class: {
          select: {
            name: true,
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        teacherProfile: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          reportDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    }),
    prisma.attendance.groupBy({
      where: {
        studentProfileId: student.id,
        classSession: {
          class: {
            academyId: session.user.academyId,
          },
        },
      },
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
  ])

  const attendanceSummary = attendanceCounts.reduce<AttendanceSummary>(
    (summary, record) => {
      summary[record.status] = record._count._all
      summary.total += record._count._all
      return summary
    },
    {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
    }
  )

  return {
    ...student,
    enrollments: enrollments.sort((left, right) => {
      if (left.status === right.status) {
        return left.class.name.localeCompare(right.class.name)
      }

      if (left.status === "active") {
        return -1
      }

      if (right.status === "active") {
        return 1
      }

      return left.status.localeCompare(right.status)
    }),
    progressSummary: {
      reportCount,
      latestReport,
      attendanceSummary,
    },
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "active":
    case "published":
      return "success"
    case "completed":
    case "archived":
      return "secondary"
    case "cancelled":
    case "dropped":
      return "destructive"
    default:
      return "outline"
  }
}

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export async function generateMetadata({
  params,
}: StudentDetailPageProps): Promise<Metadata> {
  const student = await fetchStudentMetadata(params.studentId)

  if (!student) {
    return { title: "Student Not Found" }
  }

  return {
    title: `${student.user.firstName} ${student.user.lastName} - Students - AcademyFlow`,
  }
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const student = await fetchStudent(params.studentId)

  if (!student) {
    notFound()
  }

  const enrolledClassesCount = student.enrollments.length
  const activeEnrollmentsCount = student.enrollments.filter(
    (enrollment) => enrollment.status === "active"
  ).length
  const { reportCount, latestReport, attendanceSummary } = student.progressSummary
  const attendanceParticipationCount =
    attendanceSummary.present + attendanceSummary.late + attendanceSummary.excused
  const attendanceRate =
    attendanceSummary.total > 0
      ? Math.round((attendanceParticipationCount / attendanceSummary.total) * 100)
      : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Student Profile
            </h2>
            <p className="text-muted-foreground">
              View student details and information
            </p>
          </div>
        </div>
        <Link href={`/admin/students/${params.studentId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Student
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <UserAvatar
                  firstName={student.user.firstName}
                  lastName={student.user.lastName}
                  avatarUrl={student.user.avatarUrl}
                  className="h-24 w-24"
                  fallbackClassName="bg-primary/10 text-2xl text-primary"
                  iconClassName="h-10 w-10"
                />
                <h3 className="mt-4 text-xl font-semibold">
                  {student.user.firstName} {student.user.lastName}
                </h3>
                <p className="font-mono text-sm text-muted-foreground">
                  {student.studentId}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge variant={student.user.isActive ? "success" : "secondary"}>
                    {student.user.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline">{student.gradeLevel}</Badge>
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
                <span className="text-sm">{student.user.email}</span>
              </div>
              {student.user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{student.user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  DOB: {new Date(student.dateOfBirth).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {student.emergencyContactName}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{student.emergencyContactPhone}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Grade Level
                  </p>
                  <p className="mt-1 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {student.gradeLevel}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Enrollment Date
                  </p>
                  <p className="mt-1">
                    {new Date(student.enrollmentDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {student.medicalNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">
                      Medical Notes
                    </p>
                    <p className="rounded-md bg-muted/50 p-3 text-sm">
                      {student.medicalNotes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Linked Parents
                </CardTitle>
                <CardDescription>
                  Parents/guardians linked to this student
                </CardDescription>
              </div>
              <LinkParentDialog
                studentId={params.studentId}
                existingParentIds={student.parentLinks.map((link) => link.parentProfile.id)}
              />
            </CardHeader>
            <CardContent>
              {student.parentLinks.length === 0 ? (
                <div className="py-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No parents linked yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {student.parentLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-start gap-3">
                        <UserAvatar
                          firstName={link.parentProfile.user.firstName}
                          lastName={link.parentProfile.user.lastName}
                          avatarUrl={link.parentProfile.user.avatarUrl}
                          className="h-10 w-10"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {link.parentProfile.user.firstName}{" "}
                              {link.parentProfile.user.lastName}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {link.relationshipType}
                            </Badge>
                            {link.isPrimaryForStudent && (
                              <Badge variant="secondary" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {link.parentProfile.user.email}
                          </p>
                          <div className="mt-1 flex gap-3">
                            {link.isEmergencyContact && (
                              <span className="flex items-center gap-1 text-xs text-red-600">
                                <Shield className="h-3 w-3" />
                                Emergency Contact
                              </span>
                            )}
                            {link.canPickup && (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <Car className="h-3 w-3" />
                                Can Pick Up
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Classes & Progress
              </CardTitle>
              <CardDescription>
                Enrolled classes, teacher assignments, reports, and attendance summary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Enrolled Classes
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {enrolledClassesCount}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activeEnrollmentsCount} currently active
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Reports
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{reportCount}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Academic reports on file
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Attendance
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {attendanceRate !== null ? `${attendanceRate}%` : "-"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {attendanceSummary.total} attendance record
                      {attendanceSummary.total !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Enrolled Classes
                      </h3>
                    </div>

                    {student.enrollments.length === 0 ? (
                      <div className="rounded-lg border border-dashed px-6 py-10 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">
                          No classes assigned
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          This student is not enrolled in any classes yet.
                        </p>
                      </div>
                    ) : (
                      student.enrollments.map((enrollment) => {
                        const teacherNames = enrollment.class.teachers.map(
                          (assignment) =>
                            `${assignment.teacherProfile.user.firstName} ${assignment.teacherProfile.user.lastName}`
                        )

                        return (
                          <div
                            key={enrollment.id}
                            className="rounded-lg border p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">
                                  {enrollment.class.name}
                                  {enrollment.class.section
                                    ? ` (Section ${enrollment.class.section})`
                                    : ""}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {enrollment.class.course.code} - {enrollment.class.course.name}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    getStatusBadgeVariant(enrollment.class.status) as
                                      | "default"
                                      | "secondary"
                                      | "destructive"
                                      | "outline"
                                      | "success"
                                      | "warning"
                                  }
                                >
                                  {formatEnumLabel(enrollment.class.status)}
                                </Badge>
                                <Badge variant="outline">
                                  {formatEnumLabel(enrollment.status)}
                                </Badge>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>
                                  {teacherNames.length > 0
                                    ? teacherNames.join(", ")
                                    : "No teacher assigned yet"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{enrollment.class.academicYear || "Academic year not set"}</span>
                              </div>
                            </div>

                            <div className="mt-4 rounded-md bg-muted/20 p-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Recurring Schedule
                              </p>
                              <ClassScheduleSummary
                                scheduleDays={enrollment.class.scheduleDays}
                                scheduleStartTime={enrollment.class.scheduleStartTime}
                                scheduleEndTime={enrollment.class.scheduleEndTime}
                                scheduleRecurrence={enrollment.class.scheduleRecurrence}
                                emptyMessage="No recurring schedule has been configured for this class yet."
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Latest Report
                      </h3>
                      {!latestReport ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          No reports available yet.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <div className="rounded-md bg-muted/20 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">
                                  {formatEnumLabel(latestReport.reportType)} Report
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {latestReport.class.course.code}: {latestReport.class.name}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  getStatusBadgeVariant(latestReport.status) as
                                    | "default"
                                    | "secondary"
                                    | "destructive"
                                    | "outline"
                                    | "success"
                                    | "warning"
                                }
                              >
                                {formatEnumLabel(latestReport.status)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {new Date(latestReport.reportDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Teacher: {latestReport.teacherProfile.user.firstName}{" "}
                              {latestReport.teacherProfile.user.lastName}
                            </p>
                            <Link
                              href={`/admin/reports/${latestReport.id}`}
                              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              View report
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Attendance Summary
                      </h3>
                      {attendanceSummary.total === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          No attendance records available yet.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <div className="rounded-md bg-muted/20 p-3">
                            <div className="flex items-center gap-2">
                              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium">
                                {attendanceRate}% attendance rate
                              </p>
                            </div>
                            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                <span className="text-muted-foreground">Present</span>
                                <span className="font-medium">{attendanceSummary.present}</span>
                              </div>
                              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                <span className="text-muted-foreground">Late</span>
                                <span className="font-medium">{attendanceSummary.late}</span>
                              </div>
                              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                <span className="text-muted-foreground">Absent</span>
                                <span className="font-medium">{attendanceSummary.absent}</span>
                              </div>
                              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                <span className="text-muted-foreground">Excused</span>
                                <span className="font-medium">{attendanceSummary.excused}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
