"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, Plus, Search } from "lucide-react"
import type { AdminCourseListItem } from "@/lib/admin/admin-lists-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CoursesTable } from "@/components/admin/courses/courses-table"

interface CoursesPageContentProps {
  courses: AdminCourseListItem[]
  total: number
  page: number
  limit: number
  appliedSearch: string
}

export function CoursesPageContent({
  courses,
  total,
  page,
  limit,
  appliedSearch,
}: CoursesPageContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(appliedSearch)

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()

    const params = new URLSearchParams()
    if (searchQuery) {
      params.set("search", searchQuery)
    }
    params.set("page", "1")
    params.set("limit", limit.toString())

    router.push(`/admin/courses?${params.toString()}`)
  }

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams()

    if (appliedSearch) {
      params.set("search", appliedSearch)
    }

    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())

    router.push(`/admin/courses?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Courses</h2>
          <p className="text-muted-foreground">
            Manage the academic catalog for your academy
          </p>
        </div>
        <Link href="/admin/courses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Courses</CardTitle>
          <CardDescription>
            Find courses by code, name, grade, or subject area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
            {appliedSearch ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchQuery("")
                  router.push(`/admin/courses?limit=${limit}`)
                }}
              >
                Clear
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            All Courses
          </CardTitle>
          <CardDescription>
            {total} course{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CoursesTable
            courses={courses}
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
