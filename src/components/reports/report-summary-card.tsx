"use client"

import Link from "next/link"
import { Calendar, User, BookOpen, Clock } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ReportStatusBadge } from "./report-status-badge"

interface ReportSummaryCardProps {
  report: {
    id: string
    reportType: string
    reportDate: string
    periodStart: string
    periodEnd: string
    status: string
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
  }
  href: string
  showStudent?: boolean
  showTeacher?: boolean
}

const reportTypeLabels: Record<string, string> = {
  daily: "Daily Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  term: "Term Report",
}

export function ReportSummaryCard({
  report,
  href,
  showStudent = true,
  showTeacher = true,
}: ReportSummaryCardProps) {
  return (
    <Link href={href}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">
                {reportTypeLabels[report.reportType] || report.reportType}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(report.reportDate).toLocaleDateString()}
              </CardDescription>
            </div>
            <ReportStatusBadge status={report.status as any} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {showStudent && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {report.studentProfile.user.firstName}{" "}
                {report.studentProfile.user.lastName}
                <span className="ml-1 text-muted-foreground">
                  ({report.studentProfile.studentId})
                </span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>
              {report.class.course.code}: {report.class.name}
            </span>
          </div>
          {showTeacher && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Teacher: {report.teacherProfile.user.firstName}{" "}
                {report.teacherProfile.user.lastName}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Period: {new Date(report.periodStart).toLocaleDateString()} -{" "}
              {new Date(report.periodEnd).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
