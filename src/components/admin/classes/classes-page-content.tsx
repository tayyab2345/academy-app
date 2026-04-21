"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, School, Search } from "lucide-react"
import type { AdminClassListItem } from "@/lib/admin/admin-lists-data"
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
import { ClassesTable } from "@/components/admin/classes/classes-table"

const statusOptions = ["All", "active", "completed", "cancelled"]

interface ClassesPageContentProps {
  classes: AdminClassListItem[]
  total: number
  page: number
  limit: number
  appliedSearch: string
  appliedStatusFilter: string
}

export function ClassesPageContent({
  classes,
  total,
  page,
  limit,
  appliedSearch,
  appliedStatusFilter,
}: ClassesPageContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(appliedSearch)
  const [statusFilter, setStatusFilter] = useState(
    appliedStatusFilter || "All"
  )

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()

    const params = new URLSearchParams()

    if (searchQuery) {
      params.set("search", searchQuery)
    }

    if (statusFilter && statusFilter !== "All") {
      params.set("status", statusFilter)
    }

    params.set("page", "1")
    params.set("limit", limit.toString())

    router.push(`/admin/classes?${params.toString()}`)
  }

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams()

    if (appliedSearch) {
      params.set("search", appliedSearch)
    }

    if (appliedStatusFilter) {
      params.set("status", appliedStatusFilter)
    }

    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())

    router.push(`/admin/classes?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Classes</h2>
          <p className="text-muted-foreground">
            Manage classes, enrollments, and teacher assignments
          </p>
        </div>
        <Link href="/admin/classes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Class
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Classes</CardTitle>
          <CardDescription>
            Find classes by name or section
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">Search</Button>
            {(appliedSearch || appliedStatusFilter) ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("All")
                  router.push(`/admin/classes?limit=${limit}`)
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
            <School className="h-5 w-5" />
            All Classes
          </CardTitle>
          <CardDescription>
            {total} class{total !== 1 ? "es" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClassesTable
            classes={classes}
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
