"use client"

import { Expand } from "lucide-react"
import { cn } from "@/lib/utils"

interface PostImageProps {
  imageUrl: string
  alt: string
  className?: string
  imageClassName?: string
}

export function PostImage({
  imageUrl,
  alt,
  className,
  imageClassName,
}: PostImageProps) {
  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group block overflow-hidden rounded-xl border bg-muted/20",
        className
      )}
    >
      <div className="relative">
        <img
          src={imageUrl}
          alt={alt}
          className={cn("w-full object-contain", imageClassName)}
          loading="lazy"
        />
        <div className="absolute right-3 top-3 rounded-full bg-background/90 p-2 text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
          <Expand className="h-4 w-4" />
        </div>
      </div>
    </a>
  )
}
