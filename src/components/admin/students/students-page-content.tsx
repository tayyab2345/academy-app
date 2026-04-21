"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Users } from "lucide-react"
import type { AdminStudentListItem } from "@/lib/admin/admin-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { StudentsTable } from "@/components/admin/students/students-table"

const gradeLevels = [
  "All",
  "Pre-K",
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
]

interface StudentsPageContentProps {
  students: AdminStudentListItem[]
  total: number
  page: number
  limit: number
  appliedSearch: string
  appliedGradeFilter: string
}

export function StudentsPageContent({
  students,
  total,
  page,
  limit,
  appliedSearch,
  appliedGradeFilter,
}: StudentsPageContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(appliedSearch)
  const [gradeFilter, setGradeFilter] = useState(appliedGradeFilter)

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()

    const params = new URLSearchParams()
    if (searchQuery) {
      params.set("search", searchQuery)
    }
    if (gradeFilter && gradeFilter !== "All") {
      params.set("gradeLevel", gradeFilter)
    }
    params.set("page", "1")
    params.set("limit", limit.toString())

    router.push(`/admin/students?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams()
    if (appliedSearch) {
      params.set("search", appliedSearch)
    }
    if (appliedGradeFilter) {
      params.set("gradeLevel", appliedGradeFilter)
    }
    params.set("page", newPage.toString())
    params.set("limit", limit.toString())

    router.push(`/admin/students?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Students</h2>
          <p className="text-muted-foreground">
            Manage student accounts and enrollment
          </p>
        </div>
        <Link href="/admin/students/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Students</CardTitle>
          <CardDescription>
            Find students by name, email, student ID, or grade level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={gradeFilter || "All"}
              onValueChange={(value) =>
                setGradeFilter(value === "All" ? "" : value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Grade Level" />
              </SelectTrigger>
              <SelectContent>
                {gradeLevels.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">Search</Button>
            {(appliedSearch || appliedGradeFilter) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchQuery("")
                  setGradeFilter("")
                  router.push(`/admin/students?limit=${limit}`)
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Students
          </CardTitle>
          <CardDescription>
            {total} student{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentsTable
            students={students}
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
