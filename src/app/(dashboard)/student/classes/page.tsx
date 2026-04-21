import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BookOpen, Calendar, Clock } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { isSessionActive } from "@/lib/attendance-utils"
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"

export const metadata: Metadata = {
  title: "My Classes - Student - AcademyFlow",
  description: "View your enrolled classes",
}

export default async function StudentClassesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/login")
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!studentProfile) {
    redirect("/login")
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentProfileId: studentProfile.id,
      status: "active",
    },
    include: {
        class: {
          include: {
            course: {
              select: {
                code: true,
                name: true,
                subjectArea: true,
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
                    },
                  },
                },
              },
            },
            where: {
              role: "primary",
            },
          },
          sessions: {
            where: {
              status: { in: ["scheduled", "ongoing"] },
            },
            orderBy: {
              startTime: "asc",
            },
            take: 3,
          },
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Classes</h2>
        <p className="text-muted-foreground">
          View your enrolled classes and upcoming sessions
        </p>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No classes enrolled</h3>
            <p className="text-muted-foreground">
              You haven&apos;t been enrolled in any classes yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {enrollments.map((enrollment) => {
            const cls = enrollment.class
            const primaryTeacher = cls.teachers[0]?.teacherProfile

            return (
              <Link key={cls.id} href={`/student/classes/${cls.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle>{cls.name}</CardTitle>
                    <CardDescription>
                      {cls.course.code} - {cls.course.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {primaryTeacher && (
                        <p className="text-sm">
                          Teacher: {primaryTeacher.user.firstName}{" "}
                          {primaryTeacher.user.lastName}
                        </p>
                      )}

                      <ClassScheduleSummary
                        scheduleDays={cls.scheduleDays}
                        scheduleStartTime={cls.scheduleStartTime}
                        scheduleEndTime={cls.scheduleEndTime}
                        scheduleRecurrence={cls.scheduleRecurrence}
                        emptyMessage="No recurring schedule has been configured yet."
                      />

                      {cls.sessions.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium">
                            Upcoming Sessions
                          </p>
                          <div className="space-y-2">
                            {cls.sessions.map((sessionItem) => {
                              const sessionData = {
                                startTime: new Date(sessionItem.startTime),
                                endTime: new Date(sessionItem.endTime),
                                status: sessionItem.status,
                              }
                              const live = isSessionActive(sessionData)

                              return (
                                <div
                                  key={sessionItem.id}
                                  className="flex items-center justify-between rounded-lg border p-3"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {sessionItem.title || "Class Session"}
                                    </p>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(
                                          sessionItem.startTime
                                        ).toLocaleDateString()}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(
                                          sessionItem.startTime
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                  <Badge variant={live ? "success" : "outline"}>
                                    {live ? "Live Now" : "Upcoming"}
                                  </Badge>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
