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
import { ClassScheduleSummary } from "@/components/classes/class-schedule-summary"

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
            return (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}/sessions`}>
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
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
                      {cls.nextSessionStartTime ? (
                        <div className="border-t pt-3">
                          <p className="mb-1 text-xs text-muted-foreground">
                            Next Session
                          </p>
                          <p className="text-sm font-medium">
                            {new Date(cls.nextSessionStartTime).toLocaleDateString()} at{" "}
                            {new Date(cls.nextSessionStartTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ) : null}
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
