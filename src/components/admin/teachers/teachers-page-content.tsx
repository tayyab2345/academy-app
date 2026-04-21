"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Users } from "lucide-react"
import type { AdminTeacherListItem } from "@/lib/admin/admin-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TeachersTable } from "@/components/admin/teachers/teachers-table"

interface TeachersPageContentProps {
  teachers: AdminTeacherListItem[]
  total: number
  page: number
  limit: number
  appliedSearch: string
}

export function TeachersPageContent({
  teachers,
  total,
  page,
  limit,
  appliedSearch,
}: TeachersPageContentProps) {
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

    router.push(`/admin/teachers?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams()
    if (appliedSearch) {
      params.set("search", appliedSearch)
    }
    params.set("page", newPage.toString())
    params.set("limit", limit.toString())

    router.push(`/admin/teachers?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teachers</h2>
          <p className="text-muted-foreground">
            Manage teacher accounts and profiles
          </p>
        </div>
        <Link href="/admin/teachers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Teachers</CardTitle>
          <CardDescription>
            Find teachers by name, email, or employee ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search teachers..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
            {appliedSearch && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchQuery("")
                  router.push(`/admin/teachers?limit=${limit}`)
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
            All Teachers
          </CardTitle>
          <CardDescription>
            {total} teacher{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeachersTable
            teachers={teachers}
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
