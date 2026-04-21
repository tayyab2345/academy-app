"use client"

import { ExamType } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { examTypeLabels } from "@/lib/results/result-utils"

interface ExamTypeBadgeProps {
  type: ExamType
}

const examTypeVariantMap: Record<ExamType, "default" | "secondary" | "outline"> = {
  quiz: "outline",
  monthly: "secondary",
  midterm: "default",
  final: "default",
  annual: "secondary",
}

export function ExamTypeBadge({ type }: ExamTypeBadgeProps) {
  return (
    <Badge variant={examTypeVariantMap[type]}>
      {examTypeLabels[type]}
    </Badge>
  )
}
