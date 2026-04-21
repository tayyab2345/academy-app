"use client"

import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
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

export function UserNav() {
  const { data: session } = useSession()

  if (!session?.user) return null

  const fullName = `${session.user.firstName} ${session.user.lastName}`

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <UserAvatar
            firstName={session.user.firstName}
            lastName={session.user.lastName}
            avatarUrl={session.user.avatarUrl}
            className="h-10 w-10"
            iconClassName="h-5 w-5"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <UserAvatar
              firstName={session.user.firstName}
              lastName={session.user.lastName}
              avatarUrl={session.user.avatarUrl}
              className="h-10 w-10"
            />
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{fullName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {session.user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center" disabled>
          <School className="mr-2 h-4 w-4" />
          <span>{session.user.academy?.name}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.href = `/${session.user.role}/profile`}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile Settings</span>
        </DropdownMenuItem>
        {session.user.role === "admin" && (
          <DropdownMenuItem onClick={() => window.location.href = "/admin/settings"}>
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
