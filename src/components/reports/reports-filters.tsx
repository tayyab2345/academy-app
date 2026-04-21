"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const reportTypes = [
  { value: "all", label: "All Types" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "term", label: "Term" },
]

interface ReportsFiltersProps {
  reportType: string
  onReportTypeChange: (value: string) => void
  classId?: string
  onClassIdChange?: (value: string) => void
  studentId?: string
  onStudentIdChange?: (value: string) => void
  status?: string
  onStatusChange?: (value: string) => void
  searchQuery?: string
  onSearchChange?: (value: string) => void
  onSearch?: () => void
  onClear?: () => void
  showSearch?: boolean
  showStatus?: boolean
  classes?: Array<{ id: string; name: string; course: { code: string } }>
  students?: Array<{ id: string; user: { firstName: string; lastName: string } }>
  children?: Array<{ id: string; user: { firstName: string; lastName: string } }>
  statusOptions?: Array<{ value: string; label: string }>
}

const defaultStatusOptions = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

export function ReportsFilters({
  reportType,
  onReportTypeChange,
  classId,
  onClassIdChange,
  studentId,
  onStudentIdChange,
  status,
  onStatusChange,
  searchQuery,
  onSearchChange,
  onSearch,
  onClear,
  showSearch = false,
  showStatus = false,
  classes = [],
  students = [],
  children = [],
  statusOptions = defaultStatusOptions,
}: ReportsFiltersProps) {
  const hasActiveFilters =
    reportType !== "all" ||
    (classId && classId !== "all") ||
    (studentId && studentId !== "all") ||
    (status && status !== "all") ||
    (searchQuery && searchQuery.length > 0)

  const studentList = children.length > 0 ? children : students

  return (
    <div className="flex flex-wrap items-end gap-3">
      {showSearch && onSearchChange && (
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student or teacher..."
            value={searchQuery || ""}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
            onKeyDown={(event) => {
              if (event.key === "Enter" && onSearch) {
                onSearch()
              }
            }}
          />
        </div>
      )}

      <Select value={reportType} onValueChange={onReportTypeChange}>
        <SelectTrigger className="w-[140px]">
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

      {showStatus && onStatusChange && (
        <Select value={status || "all"} onValueChange={onStatusChange}>
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
      )}

      {onClassIdChange && classes.length > 0 && (
        <Select value={classId || "all"} onValueChange={onClassIdChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((classItem) => (
              <SelectItem key={classItem.id} value={classItem.id}>
                {classItem.course.code}: {classItem.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {onStudentIdChange && studentList.length > 0 && (
        <Select value={studentId || "all"} onValueChange={onStudentIdChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={children.length > 0 ? "Child" : "Student"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {children.length > 0 ? "All Children" : "All Students"}
            </SelectItem>
            {studentList.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.user.firstName} {student.user.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {onSearch && <Button onClick={onSearch}>Apply Filters</Button>}

      {hasActiveFilters && onClear && (
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  )
}
