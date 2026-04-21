"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Plus } from "lucide-react"
import type { TeacherReportListItem } from "@/lib/reports/portal-report-data"
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
import { ReportsTable } from "@/components/teacher/reports/reports-table"

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

interface TeacherReportsPageContentProps {
  reports: TeacherReportListItem[]
  total: number
  page: number
  limit: number
  appliedTypeFilter: string
  appliedStatusFilter: string
}

export function TeacherReportsPageContent({
  reports,
  total,
  page,
  limit,
  appliedTypeFilter,
  appliedStatusFilter,
}: TeacherReportsPageContentProps) {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState(appliedTypeFilter || "all")
  const [statusFilter, setStatusFilter] = useState(appliedStatusFilter || "all")

  useEffect(() => {
    setTypeFilter(appliedTypeFilter || "all")
    setStatusFilter(appliedStatusFilter || "all")
  }, [appliedStatusFilter, appliedTypeFilter])

  const hasActiveFilters = Boolean(appliedTypeFilter || appliedStatusFilter)

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()

    const params = new URLSearchParams()

    if (typeFilter !== "all") {
      params.set("reportType", typeFilter)
    }

    if (statusFilter !== "all") {
      params.set("status", statusFilter)
    }

    params.set("page", "1")
    params.set("limit", limit.toString())

    router.push(`/teacher/reports?${params.toString()}`)
  }

  const clearFilters = () => {
    setTypeFilter("all")
    setStatusFilter("all")
    router.push(`/teacher/reports?limit=${limit}`)
  }

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams()

    if (appliedTypeFilter) {
      params.set("reportType", appliedTypeFilter)
    }

    if (appliedStatusFilter) {
      params.set("status", appliedStatusFilter)
    }

    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())

    router.push(`/teacher/reports?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Create and manage student progress reports
          </p>
        </div>
        <Link href="/teacher/reports/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Report
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
          <CardDescription>Filter by report type and status</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
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
            <Button type="submit">Apply Filters</Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Reports
          </CardTitle>
          <CardDescription>
            {total} report{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportsTable
            reports={reports}
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
