"use client"

import { Award, FileText, Percent, Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ExamSummaryCardsProps {
  studentCount: number
  enteredCount: number
  averagePercentage: number | null
  topPercentage: number | null
}

export function ExamSummaryCards({
  studentCount,
  enteredCount,
  averagePercentage,
  topPercentage,
}: ExamSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Students</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{studentCount}</div>
          <p className="text-xs text-muted-foreground">Enrolled in this class</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Marks Entered</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{enteredCount}</div>
          <p className="text-xs text-muted-foreground">
            {studentCount > 0
              ? `${Math.round((enteredCount / studentCount) * 100)}% completion`
              : "No students yet"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {averagePercentage !== null ? `${averagePercentage.toFixed(2)}%` : "-"}
          </div>
          <p className="text-xs text-muted-foreground">
            Average class percentage
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Score</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {topPercentage !== null ? `${topPercentage.toFixed(2)}%` : "-"}
          </div>
          <p className="text-xs text-muted-foreground">Highest recorded percentage</p>
        </CardContent>
      </Card>
    </div>
  )
}
