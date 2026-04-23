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
}: AcademyLogoProps) {
  const fallbackLogoSrc = "/branding/academyflow-mark.png"

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
    <img
      src={fallbackLogoSrc}
      alt={name || "AcademyFlow"}
      className={cn(
        "h-8 w-8 rounded-[0.9rem] object-cover shadow-[0_14px_30px_-18px_rgba(5,150,105,0.65)]",
        className,
        imageClassName
      )}
      loading="eager"
      decoding="async"
      style={primaryColor ? { backgroundColor: primaryColor } : undefined}
    />
  )
}
