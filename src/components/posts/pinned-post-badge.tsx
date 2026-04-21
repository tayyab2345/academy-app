"use client"

import { Pin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PinnedPostBadgeProps {
  className?: string
}

export function PinnedPostBadge({ className }: PinnedPostBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("gap-1", className)}>
      <Pin className="h-3 w-3" />
      Pinned
    </Badge>
  )
}
