"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Eye, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { PostLikeButton } from "./post-like-button"

interface PostEngagementBarProps {
  postId: string
  commentsCount: number
  likesCount: number
  viewsCount: number
  likedByCurrentUser: boolean
  commentsHref?: string
  trackView?: boolean
  className?: string
}

export function PostEngagementBar({
  postId,
  commentsCount,
  likesCount,
  viewsCount,
  likedByCurrentUser,
  commentsHref,
  trackView = false,
  className,
}: PostEngagementBarProps) {
  const hasTrackedViewRef = useRef(false)
  const [viewCount, setViewCount] = useState(viewsCount)

  useEffect(() => {
    setViewCount(viewsCount)
  }, [viewsCount])

  useEffect(() => {
    if (!trackView || hasTrackedViewRef.current) {
      return
    }

    hasTrackedViewRef.current = true

    fetch(`/api/posts/${postId}/view`, {
      method: "POST",
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(data?.error || "Failed to record view")
        }

        setViewCount(Number(data.viewCount) || 0)
      })
      .catch((error) => {
        console.error("Failed to record post view:", error)
      })
  }, [postId, trackView])

  const commentsContent = (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <MessageSquare className="h-4 w-4" />
      <span>{commentsCount}</span>
      <span>
        comment{commentsCount === 1 ? "" : "s"}
      </span>
    </span>
  )

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-t pt-4",
        className
      )}
    >
      <PostLikeButton
        postId={postId}
        initialLiked={likedByCurrentUser}
        initialLikeCount={likesCount}
      />

      {commentsHref ? (
        <Link href={commentsHref} className="rounded-md px-2 py-1 hover:bg-muted">
          {commentsContent}
        </Link>
      ) : (
        commentsContent
      )}

      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Eye className="h-4 w-4" />
        <span>{viewCount}</span>
        <span>view{viewCount === 1 ? "" : "s"}</span>
      </span>
    </div>
  )
}
