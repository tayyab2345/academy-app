"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageSquare, Plus } from "lucide-react"
import type {
  PostFilterClassOption,
  PostPageListItem,
} from "@/lib/posts/post-page-data"
import { PostsList } from "@/components/posts/posts-list"
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

interface PostsPageContentProps {
  heading: string
  description: string
  posts: PostPageListItem[]
  total: number
  page: number
  limit: number
  baseUrl: string
  emptyMessage: string
  createHref?: string
  createLabel?: string
  availableClasses?: PostFilterClassOption[]
  appliedClassId?: string
}

export function PostsPageContent({
  heading,
  description,
  posts,
  total,
  page,
  limit,
  baseUrl,
  emptyMessage,
  createHref,
  createLabel,
  availableClasses = [],
  appliedClassId = "",
}: PostsPageContentProps) {
  const router = useRouter()
  const [classFilter, setClassFilter] = useState(appliedClassId || "all")
  const showClassFilter = availableClasses.length > 0

  const buildParams = (nextPage: number, nextClassId: string) => {
    const params = new URLSearchParams()

    if (nextClassId !== "all") {
      params.set("classId", nextClassId)
    }

    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())

    return params
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {createHref && createLabel ? (
          <Button asChild>
            <Link href={createHref}>
              <Plus className="mr-2 h-4 w-4" />
              {createLabel}
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            All Announcements
          </CardTitle>
          <CardDescription>
            {total} announcement{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showClassFilter ? (
            <div className="mb-4">
              <Select
                value={classFilter}
                onValueChange={(value) => {
                  setClassFilter(value)
                  router.push(`${baseUrl}?${buildParams(1, value).toString()}`)
                }}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filter by class" />
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
            </div>
          ) : null}

          <PostsList
            posts={posts}
            baseUrl={baseUrl}
            emptyMessage={emptyMessage}
            showClass
          />

          {total > limit ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `${baseUrl}?${buildParams(page - 1, classFilter).toString()}`
                    )
                  }
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `${baseUrl}?${buildParams(page + 1, classFilter).toString()}`
                    )
                  }
                  disabled={page >= totalPages}
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
