"use client"

import { useEffect, useState } from "react"
import { Heart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PostLikeButtonProps {
  postId: string
  initialLiked: boolean
  initialLikeCount: number
  className?: string
}

export function PostLikeButton({
  postId,
  initialLiked,
  initialLikeCount,
  className,
}: PostLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setLiked(initialLiked)
    setLikeCount(initialLikeCount)
  }, [initialLiked, initialLikeCount])

  const handleToggleLike = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update like")
      }

      setLiked(Boolean(data.liked))
      setLikeCount(Number(data.likeCount) || 0)
    } catch (error) {
      console.error("Failed to toggle post like:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={liked ? "secondary" : "ghost"}
      size="sm"
      onClick={handleToggleLike}
      disabled={isLoading}
      className={cn("gap-2", className)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart
          className={cn("h-4 w-4", liked && "fill-current text-red-500")}
        />
      )}
      <span>{liked ? "Liked" : "Like"}</span>
      <span>({likeCount})</span>
    </Button>
  )
}
