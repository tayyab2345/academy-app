import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import { getFullName, getUserInitials } from "@/lib/user-display"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserAvatarProps {
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
  className?: string
  fallbackClassName?: string
  iconClassName?: string
}

export function UserAvatar({
  firstName,
  lastName,
  avatarUrl,
  className,
  fallbackClassName,
  iconClassName,
}: UserAvatarProps) {
  const fullName = getFullName(firstName, lastName) || "User"
  const initials = getUserInitials(firstName, lastName)

  return (
    <Avatar className={className}>
      <AvatarImage src={avatarUrl || undefined} alt={fullName} />
      <AvatarFallback
        className={cn("bg-primary/10 text-primary", fallbackClassName)}
      >
        {initials || <User className={cn("h-4 w-4", iconClassName)} />}
      </AvatarFallback>
    </Avatar>
  )
}
