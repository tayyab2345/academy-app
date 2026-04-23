"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"
import type { TeacherClassSessionListItem } from "@/lib/teacher/teacher-class-data"
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
    course: {
      code: string
      name: string
      syllabusPdfUrl: string | null
      syllabusImageUrl: string | null
    }
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

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams()
    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())
    router.push(`${baseUrl}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        <Link href={`${baseUrl}/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Session
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recurring Schedule</CardTitle>
          <CardDescription>
            Weekly timetable for this class
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
            {total} session{total !== 1 ? "s" : ""} total
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
