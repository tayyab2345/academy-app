"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, Clock, FileCheck, FileText } from "lucide-react"
import type {
  AdminReportFilterClass,
  AdminReportFilterTeacher,
  AdminReportTableItem,
} from "@/lib/admin/admin-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AdminReportsTable } from "@/components/admin/reports/admin-reports-table"

const reportTypes = [
  { value: "all", label: "All Types" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "term", label: "Term" },
]

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

interface ReportsPageContentProps {
  reports: AdminReportTableItem[]
  total: number
  page: number
  limit: number
  summary: {
    total: number
    draft: number
    published: number
    archived: number
  }
  availableClasses: AdminReportFilterClass[]
  availableTeachers: AdminReportFilterTeacher[]
  appliedSearch: string
  appliedStatusFilter: string
  appliedTypeFilter: string
  appliedClassFilter: string
  appliedTeacherFilter: string
}

export function ReportsPageContent({
  reports,
  total,
  page,
  limit,
  summary,
  availableClasses,
  availableTeachers,
  appliedSearch,
  appliedStatusFilter,
  appliedTypeFilter,
  appliedClassFilter,
  appliedTeacherFilter,
}: ReportsPageContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(appliedSearch)
  const [statusFilter, setStatusFilter] = useState(appliedStatusFilter || "all")
  const [typeFilter, setTypeFilter] = useState(appliedTypeFilter || "all")
  const [classFilter, setClassFilter] = useState(appliedClassFilter || "all")
  const [teacherFilter, setTeacherFilter] = useState(
    appliedTeacherFilter || "all"
  )

  const hasActiveFilters =
    Boolean(appliedSearch) ||
    Boolean(appliedStatusFilter) ||
    Boolean(appliedTypeFilter) ||
    Boolean(appliedClassFilter) ||
    Boolean(appliedTeacherFilter)

  const buildParams = (nextPage: number) => {
    const params = new URLSearchParams()

    if (appliedSearch) {
      params.set("search", appliedSearch)
    }
    if (appliedStatusFilter) {
      params.set("status", appliedStatusFilter)
    }
    if (appliedTypeFilter) {
      params.set("reportType", appliedTypeFilter)
    }
    if (appliedClassFilter) {
      params.set("classId", appliedClassFilter)
    }
    if (appliedTeacherFilter) {
      params.set("teacherId", appliedTeacherFilter)
    }
    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())

    return params
  }

  const handleSearch = () => {
    const params = new URLSearchParams()

    if (searchQuery) {
      params.set("search", searchQuery)
    }
    if (statusFilter !== "all") {
      params.set("status", statusFilter)
    }
    if (typeFilter !== "all") {
      params.set("reportType", typeFilter)
    }
    if (classFilter !== "all") {
      params.set("classId", classFilter)
    }
    if (teacherFilter !== "all") {
      params.set("teacherId", teacherFilter)
    }
    params.set("page", "1")
    params.set("limit", limit.toString())

    router.push(`/admin/reports?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          View and manage all academy reports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.draft}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <FileCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.published}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.archived}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
          <CardDescription>
            Search and filter through all academy reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Search by student or teacher name..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch()
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {availableClasses.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.course.code}: {classItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {availableTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.user.firstName} {teacher.user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSearch}>Apply Filters</Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                    setTypeFilter("all")
                    setClassFilter("all")
                    setTeacherFilter("all")
                    router.push(`/admin/reports?limit=${limit}`)
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Reports</CardTitle>
          <CardDescription>
            {total} report{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminReportsTable
            reports={reports}
            total={total}
            page={page}
            limit={limit}
            onPageChange={(newPage) => {
              router.push(`/admin/reports?${buildParams(newPage).toString()}`)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
