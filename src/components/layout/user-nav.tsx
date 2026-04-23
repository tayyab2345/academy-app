"use client"

import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  LogOut,
  Settings,
  User,
  School,
} from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"

export function UserNav({
  currentUser,
}: {
  currentUser: Session["user"]
}) {
  const router = useRouter()
  const fullName = `${currentUser.firstName} ${currentUser.lastName}`

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <UserAvatar
            firstName={currentUser.firstName}
            lastName={currentUser.lastName}
            avatarUrl={currentUser.avatarUrl}
            className="h-10 w-10"
            iconClassName="h-5 w-5"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-72 max-w-[calc(100vw-1rem)]"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <UserAvatar
              firstName={currentUser.firstName}
              lastName={currentUser.lastName}
              avatarUrl={currentUser.avatarUrl}
              className="h-10 w-10"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="break-words text-sm font-medium leading-snug">
                {fullName}
              </p>
              <p className="break-all text-xs leading-snug text-muted-foreground">
                {currentUser.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center" disabled>
          <School className="mr-2 h-4 w-4" />
          <span>{currentUser.academy?.name}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/${currentUser.role}/profile`)}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile Settings</span>
        </DropdownMenuItem>
        {currentUser.role === "admin" && (
          <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Academy Settings</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
