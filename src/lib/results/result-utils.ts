import { ExamType, ResultFileType } from "@prisma/client"

export const examTypeLabels: Record<ExamType, string> = {
  quiz: "Quiz",
  monthly: "Monthly Test",
  midterm: "Mid Term",
  final: "Final",
  annual: "Annual",
}

export const resultFileTypeLabels: Record<ResultFileType, string> = {
  monthly_report: "Monthly Report",
  annual_report: "Annual Report",
  marksheet: "Marksheet",
}

export function isExamType(value: string): value is ExamType {
  return value in examTypeLabels
}

export function isResultFileType(value: string): value is ResultFileType {
  return value in resultFileTypeLabels
}

export function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100
}

export function calculatePercentage(obtainedMarks: number, totalMarks: number) {
  if (!Number.isFinite(obtainedMarks) || !Number.isFinite(totalMarks) || totalMarks <= 0) {
    return 0
  }

  return roundToTwoDecimals((obtainedMarks / totalMarks) * 100)
}

export function calculateGrade(percentage: number) {
  if (percentage >= 90) {
    return "A+"
  }

  if (percentage >= 80) {
    return "A"
  }

  if (percentage >= 70) {
    return "B"
  }

  if (percentage >= 60) {
    return "C"
  }

  if (percentage >= 50) {
    return "D"
  }

  return "F"
}

export function formatExamMonthYear(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}
