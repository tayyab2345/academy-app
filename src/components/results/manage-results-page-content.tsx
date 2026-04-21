"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ExamType } from "@prisma/client"
import { FileText, Plus } from "lucide-react"
import {
  ManageExamListItem,
  ResultClassOption,
} from "@/lib/results/result-data"
import { examTypeLabels } from "@/lib/results/result-utils"
import { ExamTypeBadge } from "@/components/results/exam-type-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ManageResultsPageContentProps {
  title: string
  description: string
  basePath: string
  exams: ManageExamListItem[]
  total: number
  page: number
  limit: number
  availableClasses: ResultClassOption[]
  appliedType: string
  appliedClassId: string
}

export function ManageResultsPageContent({
  title,
  description,
  basePath,
  exams,
  total,
  page,
  limit,
  availableClasses,
  appliedType,
  appliedClassId,
}: ManageResultsPageContentProps) {
  const router = useRouter()
  const currentType = appliedType || "all"
  const currentClassId = appliedClassId || "all"
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total])

  const buildParams = (overrides?: {
    type?: string
    classId?: string
    page?: number
  }) => {
    const params = new URLSearchParams()
    const nextType = overrides?.type ?? currentType
    const nextClassId = overrides?.classId ?? currentClassId
    const nextPage = overrides?.page ?? 1

    if (nextType !== "all") {
      params.set("type", nextType)
    }

    if (nextClassId !== "all") {
      params.set("classId", nextClassId)
    }

    params.set("page", String(nextPage))
    params.set("limit", String(limit))
    return params
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Link href={`${basePath}/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Exam
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
          <CardDescription>Filter exams by class and type</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row">
          <Select
            value={currentClassId}
            onValueChange={(value) => router.push(`${basePath}?${buildParams({ classId: value }).toString()}`)}
          >
            <SelectTrigger className="w-full md:w-[260px]">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {availableClasses.map((classOption) => (
                <SelectItem key={classOption.id} value={classOption.id}>
                  {classOption.course.code}: {classOption.name}
                  {classOption.section ? ` (Section ${classOption.section})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentType}
            onValueChange={(value) => router.push(`${basePath}?${buildParams({ type: value }).toString()}`)}
          >
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="All exam types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exam Types</SelectItem>
              {Object.values(ExamType).map((type) => (
                <SelectItem key={type} value={type}>
                  {examTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exams & Results
          </CardTitle>
          <CardDescription>
            {total} exam{total === 1 ? "" : "s"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <div className="rounded-lg border border-dashed px-6 py-12 text-center">
              <p className="text-lg font-semibold">No exams created yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first exam to start entering marks and uploading results.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => (
                <Link
                  key={exam.id}
                  href={`${basePath}/${exam.id}`}
                  className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold">{exam.name}</p>
                        <ExamTypeBadge type={exam.type} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {exam.class.course.code}: {exam.class.name}
                        {exam.class.section ? ` (Section ${exam.class.section})` : ""}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Exam Date: {new Date(exam.examDate).toLocaleDateString()} • Total Marks:{" "}
                        {exam.totalMarks.toFixed(2)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <MiniStat label="Marks Entered" value={String(exam.summary.enteredCount)} />
                      <MiniStat
                        label="Average"
                        value={
                          exam.summary.averagePercentage !== null
                            ? `${exam.summary.averagePercentage.toFixed(2)}%`
                            : "-"
                        }
                      />
                      <MiniStat
                        label="Files"
                        value={String(exam._count.resultFiles)}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() =>
                    router.push(`${basePath}?${buildParams({ page: page - 1 }).toString()}`)
                  }
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    router.push(`${basePath}?${buildParams({ page: page + 1 }).toString()}`)
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}
