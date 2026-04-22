"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  DollarSign,
  FileText,
  MessageSquare,
  Receipt,
  Settings,
  Bell,
  School,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AcademyLogo } from "@/components/ui/academy-logo"

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  roles: Array<"admin" | "teacher" | "student" | "parent">
}

const navigation: NavItem[] = [
  {
    title: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    title: "Teachers",
    href: "/admin/teachers",
    icon: GraduationCap,
    roles: ["admin"],
  },
  {
    title: "Students",
    href: "/admin/students",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Parents",
    href: "/admin/parents",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Courses",
    href: "/admin/courses",
    icon: BookOpen,
    roles: ["admin"],
  },
  {
    title: "Classes",
    href: "/admin/classes",
    icon: School,
    roles: ["admin"],
  },
  {
    title: "Attendance",
    href: "/admin/attendance",
    icon: ClipboardCheck,
    roles: ["admin"],
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["admin"],
  },
  {
    title: "Finance",
    href: "/admin/finance",
    icon: DollarSign,
    roles: ["admin"],
  },
  {
    title: "Payroll",
    href: "/admin/payroll",
    icon: DollarSign,
    roles: ["admin"],
  },
  {
    title: "Fee Plans",
    href: "/admin/finance/fee-plans",
    icon: FileText,
    roles: ["admin"],
  },
  {
    title: "Invoices",
    href: "/admin/finance/invoices",
    icon: Receipt,
    roles: ["admin"],
  },
  {
    title: "Manual Payments",
    href: "/admin/finance/manual-payments",
    icon: Receipt,
    roles: ["admin"],
  },
  {
    title: "Payment Settings",
    href: "/admin/finance/payment-settings",
    icon: Settings,
    roles: ["admin"],
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: FileText,
    roles: ["admin"],
  },
  {
    title: "Results",
    href: "/admin/results",
    icon: FileText,
    roles: ["admin"],
  },
  {
    title: "Posts",
    href: "/admin/posts",
    icon: MessageSquare,
    roles: ["admin"],
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
    roles: ["admin", "teacher", "student", "parent"],
  },
  {
    title: "Overview",
    href: "/teacher",
    icon: LayoutDashboard,
    roles: ["teacher"],
  },
  {
    title: "My Classes",
    href: "/teacher/classes",
    icon: BookOpen,
    roles: ["teacher"],
  },
  {
    title: "Attendance",
    href: "/teacher/attendance",
    icon: ClipboardCheck,
    roles: ["teacher"],
  },
  {
    title: "Payroll",
    href: "/teacher/payroll",
    icon: DollarSign,
    roles: ["teacher"],
  },
  {
    title: "Reports",
    href: "/teacher/reports",
    icon: FileText,
    roles: ["teacher"],
  },
  {
    title: "Results",
    href: "/teacher/results",
    icon: FileText,
    roles: ["teacher"],
  },
  {
    title: "Posts",
    href: "/teacher/posts",
    icon: MessageSquare,
    roles: ["teacher"],
  },
  {
    title: "Overview",
    href: "/student",
    icon: LayoutDashboard,
    roles: ["student"],
  },
  {
    title: "My Classes",
    href: "/student/classes",
    icon: BookOpen,
    roles: ["student"],
  },
  {
    title: "Attendance",
    href: "/student/attendance",
    icon: ClipboardCheck,
    roles: ["student"],
  },
  {
    title: "Finance",
    href: "/student/finance",
    icon: DollarSign,
    roles: ["student"],
  },
  {
    title: "Reports",
    href: "/student/reports",
    icon: FileText,
    roles: ["student"],
  },
  {
    title: "Results",
    href: "/student/results",
    icon: FileText,
    roles: ["student"],
  },
  {
    title: "Posts",
    href: "/student/posts",
    icon: MessageSquare,
    roles: ["student"],
  },
  {
    title: "Overview",
    href: "/parent",
    icon: LayoutDashboard,
    roles: ["parent"],
  },
  {
    title: "Attendance",
    href: "/parent/attendance",
    icon: ClipboardCheck,
    roles: ["parent"],
  },
  {
    title: "Finance",
    href: "/parent/finance",
    icon: DollarSign,
    roles: ["parent"],
  },
  {
    title: "Reports",
    href: "/parent/reports",
    icon: FileText,
    roles: ["parent"],
  },
  {
    title: "Results",
    href: "/parent/results",
    icon: FileText,
    roles: ["parent"],
  },
  {
    title: "Posts",
    href: "/parent/posts",
    icon: MessageSquare,
    roles: ["parent"],
  },
]

interface AppSidebarProps {
  className?: string
}

export function AppSidebar({ className }: AppSidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const academyName = session?.user.academy?.name?.trim() || "AcademyFlow"
  const homeHref = userRole ? `/${userRole}` : "/"
  const portalLabel = userRole ? `${userRole} Portal` : "Academy Portal"

  const filteredNavigation = navigation.filter(
    (item) => userRole && item.roles.includes(userRole)
  )

  return (
    <div className={cn("flex h-full flex-col border-r bg-background", className)}>
      <div className="flex h-16 items-center border-b px-4">
        <Link href={homeHref} className="flex items-center gap-2">
          <AcademyLogo
            name={session?.user.academy?.name}
            logoUrl={session?.user.academy?.logoUrl}
            primaryColor={session?.user.academy?.primaryColor}
          />
          <div className="flex flex-col">
            <span className="line-clamp-1 text-sm font-semibold leading-tight">
              {academyName}
            </span>
            <span className="text-xs text-muted-foreground">
              {portalLabel}
            </span>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-1 px-2">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive && "bg-secondary"
                  )}
                  style={
                    isActive
                      ? {
                          backgroundColor: session?.user.academy?.primaryColor
                            ? `${session.user.academy.primaryColor}15`
                            : undefined,
                          color: session?.user.academy?.primaryColor || undefined,
                        }
                      : undefined
                  }
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1">
            <p>AcademyFlow v0.1.0</p>
            <p className="mt-1">
              &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
