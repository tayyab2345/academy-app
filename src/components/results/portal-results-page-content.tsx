"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ExamType } from "@prisma/client"
import { FileText, Users } from "lucide-react"
import {
  ParentResultChildOption,
  PortalResultListItem,
  ResultClassOption,
} from "@/lib/results/result-data"
import { examTypeLabels, resultFileTypeLabels } from "@/lib/results/result-utils"
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
import { Badge } from "@/components/ui/badge"

interface PortalResultsPageContentProps {
  title: string
  description: string
  basePath: string
  results: PortalResultListItem[]
  total: number
  page: number
  limit: number
  availableClasses: ResultClassOption[]
  children?: ParentResultChildOption[]
  appliedType: string
  appliedClassId: string
  appliedStudentId?: string
  emptyMessage: string
  showStudent?: boolean
}

export function PortalResultsPageContent({
  title,
  description,
  basePath,
  results,
  total,
  page,
  limit,
  availableClasses,
  children = [],
  appliedType,
  appliedClassId,
  appliedStudentId = "",
  emptyMessage,
  showStudent = false,
}: PortalResultsPageContentProps) {
  const router = useRouter()
  const currentType = appliedType || "all"
  const currentClassId = appliedClassId || "all"
  const currentStudentId = appliedStudentId || "all"
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total])

  const buildParams = (overrides?: {
    type?: string
    classId?: string
    studentId?: string
    page?: number
  }) => {
    const params = new URLSearchParams()
    const nextType = overrides?.type ?? currentType
    const nextClassId = overrides?.classId ?? currentClassId
    const nextStudentId = overrides?.studentId ?? currentStudentId
    const nextPage = overrides?.page ?? 1

    if (nextType !== "all") {
      params.set("type", nextType)
    }

    if (nextClassId !== "all") {
      params.set("classId", nextClassId)
    }

    if (children.length > 0 && nextStudentId !== "all") {
      params.set("studentId", nextStudentId)
    }

    params.set("page", String(nextPage))
    params.set("limit", String(limit))

    return params
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {children.length === 0 && showStudent ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-semibold">No linked children</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Results will appear here once a child is linked to your account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Filter Results</CardTitle>
              <CardDescription>Filter by exam type, class, and student</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row">
              {children.length > 0 ? (
                <Select
                  value={currentStudentId}
                  onValueChange={(value) => router.push(`${basePath}?${buildParams({ studentId: value }).toString()}`)}
                >
                  <SelectTrigger className="w-full md:w-[240px]">
                    <SelectValue placeholder="All children" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Children</SelectItem>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.user.firstName} {child.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

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
                Results
              </CardTitle>
              <CardDescription>
                {total} exam result{total === 1 ? "" : "s"} available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((result) => (
                    <div key={`${result.examId}-${result.studentProfile?.id || "self"}`} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold">{result.examName}</p>
                            <ExamTypeBadge type={result.examType} />
                            {showStudent && result.studentProfile ? (
                              <Badge variant="secondary">
                                {result.studentProfile.user.firstName}{" "}
                                {result.studentProfile.user.lastName}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {result.class.course.code}: {result.class.name}
                            {result.class.section ? ` (Section ${result.class.section})` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Exam Date: {new Date(result.examDate).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <ResultMiniStat
                            label="Marks"
                            value={`${result.obtainedMarks.toFixed(2)} / ${result.totalMarks.toFixed(2)}`}
                          />
                          <ResultMiniStat
                            label="Percentage"
                            value={`${result.percentage.toFixed(2)}%`}
                          />
                          <ResultMiniStat
                            label="Grade"
                            value={result.grade || "-"}
                          />
                        </div>
                      </div>

                      {result.remarks ? (
                        <div className="mt-4 rounded-lg bg-muted/20 p-3 text-sm">
                          <p className="font-medium">Remarks</p>
                          <p className="mt-1 text-muted-foreground">{result.remarks}</p>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {result.files.length > 0 ? (
                          result.files.map((file) => (
                            <Button
                              key={file.id}
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(file.fileUrl, "_blank", "noopener,noreferrer")}
                            >
                              {resultFileTypeLabels[file.fileType as keyof typeof resultFileTypeLabels] || file.fileType}
                            </Button>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No result file uploaded for this exam yet.</span>
                        )}
                      </div>
                    </div>
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
        </>
      )}
    </div>
  )
}

function ResultMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}
