import { School } from "lucide-react"
import { cn } from "@/lib/utils"

interface AcademyLogoProps {
  name?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  className?: string
  imageClassName?: string
  iconClassName?: string
}

export function AcademyLogo({
  name,
  logoUrl,
  primaryColor,
  className,
  imageClassName,
  iconClassName,
}: AcademyLogoProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name || "Academy"}
        className={cn("h-8 w-8 rounded object-cover", className, imageClassName)}
        loading="eager"
        decoding="async"
      />
    )
  }

  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md",
        className
      )}
      style={{
        backgroundColor: primaryColor || "#059669",
      }}
    >
      <School className={cn("h-5 w-5 text-white", iconClassName)} />
    </div>
  )
}
