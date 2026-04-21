"use client"

import { User, BookOpen, Clock, Star, Download } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ReportStatusBadge } from "./report-status-badge"

interface ReportSection {
  id: string
  sectionType: string
  content: string | null
  contentJson: any
  rating: number | null
  orderIndex: number
}

interface ReportViewerProps {
  report: {
    id: string
    reportType: string
    reportDate: string | Date
    periodStart: string | Date
    periodEnd: string | Date
    status: string
    publishedAt: string | Date | null
    studentProfile: {
      studentId: string
      user: {
        firstName: string
        lastName: string
      }
    }
    class: {
      name: string
      course: {
        code: string
        name: string
      }
    }
    teacherProfile: {
      user: {
        firstName: string
        lastName: string
      }
    }
    sections: ReportSection[]
  }
  showActions?: boolean
  onDownload?: () => void
}

const sectionTypeLabels: Record<string, string> = {
  attendance: "Attendance",
  homework: "Homework Completion",
  strengths: "Strengths",
  improvements: "Areas for Improvement",
  next_focus: "Next Focus",
  teacher_remarks: "Teacher Remarks",
  behavior: "Behavior",
  grades: "Grades",
}

const reportTypeLabels: Record<string, string> = {
  daily: "Daily Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  term: "Term Report",
}

export function ReportViewer({
  report,
  showActions = true,
  onDownload,
}: ReportViewerProps) {
  const renderRating = (rating: number | null) => {
    if (!rating) {
      return null
    }

    return (
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    )
  }

  const renderAttendanceSection = (section: ReportSection) => {
    if (!section.contentJson) {
      return (
        <p className="text-muted-foreground">
          {section.content || "No attendance data"}
        </p>
      )
    }

    const data = section.contentJson

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-2xl font-bold">{data.totalSessions || 0}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-950/20">
            <p className="text-2xl font-bold text-green-600">
              {data.present || 0}
            </p>
            <p className="text-xs text-muted-foreground">Present</p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-3 text-center dark:bg-yellow-950/20">
            <p className="text-2xl font-bold text-yellow-600">
              {data.late || 0}
            </p>
            <p className="text-xs text-muted-foreground">Late</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950/20">
            <p className="text-2xl font-bold text-red-600">
              {data.absent || 0}
            </p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </div>
        </div>
        {section.content && (
          <p className="mt-3 text-sm text-muted-foreground">
            {section.content}
          </p>
        )}
      </div>
    )
  }

  const renderGradesSection = (section: ReportSection) => {
    if (!section.contentJson?.grades) {
      return (
        <p className="text-muted-foreground">
          {section.content || "No grades recorded"}
        </p>
      )
    }

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          {section.contentJson.grades.map((grade: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between rounded border p-2"
            >
              <span className="font-medium">{grade.subject}</span>
              <span className="rounded border px-2 py-0.5 text-xs">
                {grade.grade}
              </span>
            </div>
          ))}
        </div>
        {section.content && (
          <p className="text-sm text-muted-foreground">{section.content}</p>
        )}
      </div>
    )
  }

  const renderSection = (section: ReportSection) => {
    if (section.sectionType === "attendance") {
      return renderAttendanceSection(section)
    }

    if (section.sectionType === "grades") {
      return renderGradesSection(section)
    }

    return (
      <>
        <p className="whitespace-pre-wrap">{section.content || "No comments"}</p>
        {renderRating(section.rating)}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">
                  {reportTypeLabels[report.reportType] || report.reportType}
                </CardTitle>
                <ReportStatusBadge status={report.status as any} />
              </div>
              <CardDescription className="mt-2">
                Generated on {new Date(report.reportDate).toLocaleDateString()}
                {report.publishedAt && (
                  <>
                    {" "}
                    | Published{" "}
                    {new Date(report.publishedAt).toLocaleDateString()}
                  </>
                )}
              </CardDescription>
            </div>
            {showActions && onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">Student:</span>{" "}
                {report.studentProfile.user.firstName}{" "}
                {report.studentProfile.user.lastName}
                <span className="ml-1 text-muted-foreground">
                  ({report.studentProfile.studentId})
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">Class:</span>{" "}
                {report.class.course.code}: {report.class.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">Teacher:</span>{" "}
                {report.teacherProfile.user.firstName}{" "}
                {report.teacherProfile.user.lastName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">Period:</span>{" "}
                {new Date(report.periodStart).toLocaleDateString()} -{" "}
                {new Date(report.periodEnd).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {report.sections.length > 0 && (
        <div className="space-y-4">
          {report.sections
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((section) => (
              <Card key={section.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {sectionTypeLabels[section.sectionType] || section.sectionType}
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderSection(section)}</CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
