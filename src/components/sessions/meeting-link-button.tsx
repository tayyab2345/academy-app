import Link from "next/link"
import { ExternalLink, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MeetingLinkButtonProps {
  href: string
  label?: string
  className?: string
}

export function MeetingLinkButton({
  href,
  label = "Join Class",
  className,
}: MeetingLinkButtonProps) {
  return (
    <Button
      asChild
      className={cn(
        "w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto",
        className
      )}
    >
      <Link href={href} target="_blank" rel="noreferrer">
        {label === "Join Class" ? (
          <Video className="mr-2 h-4 w-4" />
        ) : (
          <ExternalLink className="mr-2 h-4 w-4" />
        )}
        {label}
      </Link>
    </Button>
  )
}
