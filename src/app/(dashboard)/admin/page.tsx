import type { ComponentType } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CreditCard,
  FileText,
  GraduationCap,
  MessageSquare,
  Receipt,
  Settings,
  Users,
} from "lucide-react"
import { authOptions } from "@/lib/auth"
import { getAdminDashboardOverviewData } from "@/lib/admin/admin-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type SetupItem = {
  key: string
  title: string
  description: string
  completed: boolean
  href: string
  metric: string
}

type RecentActivityItem = {
  id: string
  type: "teacher" | "student" | "invoice" | "payment" | "report" | "post"
  title: string
  description: string
  href: string
  timestamp: Date | string | null | undefined
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const now = new Date()
  const overview = await getAdminDashboardOverviewData(session.user.academyId)
  const academyName = overview.academyName || session.user.academy?.name || "Your Academy"
  const primaryColor = overview.primaryColor || session.user.academy?.primaryColor || "#059669"
  const setupItems = overview.setupItems as SetupItem[]
  const completedSetupItems = overview.completedSetupItems
  const nextAction = overview.nextAction
  const recentActivity = overview.recentActivity as RecentActivityItem[]

  return (
    <div className="mx-auto w-full max-w-full space-y-4 sm:space-y-6">
      <div
        className="overflow-hidden rounded-lg border p-4 sm:p-6"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}10 0%, transparent 100%)`,
          borderColor: `${primaryColor}30`,
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold tracking-tight sm:text-2xl">
              Welcome to {academyName}
            </h2>
            <p className="mt-2 break-words text-sm text-muted-foreground sm:text-base">
              {completedSetupItems === setupItems.length
                ? "Your academy setup is complete. Here is a live overview of students, staff, classes, and finance."
                : `${completedSetupItems} of ${setupItems.length} setup steps are complete. Finish the remaining items to unlock your academy's full workflow.`}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto">
            {nextAction && (
              <Link href={nextAction.href} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  {nextAction.title}
                </Button>
              </Link>
            )}
            <Link href="/admin/settings" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <Settings className="mr-2 h-4 w-4" />
                Academy Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={overview.stats.studentCount.toLocaleString()}
          description="Student profiles in your academy"
          icon={Users}
        />
        <StatCard
          title="Total Teachers"
          value={overview.stats.teacherCount.toLocaleString()}
          description="Teacher profiles in your academy"
          icon={GraduationCap}
        />
        <StatCard
          title="Active Classes"
          value={overview.stats.activeClassCount.toLocaleString()}
          description="Classes currently marked active"
          icon={BookOpen}
        />
        <StatCard
          title="Revenue (MTD)"
          value={overview.stats.revenueMtd.value}
          description={overview.stats.revenueMtd.description}
          detail={overview.stats.revenueMtd.detail}
          icon={CreditCard}
        />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="w-full overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="break-words text-xl sm:text-2xl">
                  Academy Setup Progress
                </CardTitle>
                <CardDescription className="break-words">
                  {completedSetupItems} of {setupItems.length} key setup items complete
                </CardDescription>
              </div>
              <Badge
                variant={completedSetupItems === setupItems.length ? "success" : "secondary"}
                className="w-fit shrink-0"
              >
                {Math.round((completedSetupItems / setupItems.length) * 100)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {setupItems.map((item, index) => (
              <SetupProgressItem key={item.key} item={item} index={index + 1} />
            ))}
          </CardContent>
        </Card>

        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="break-words text-xl sm:text-2xl">
              Recent Activity
            </CardTitle>
            <CardDescription className="break-words">
              The latest staff, student, finance, report, and announcement activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Activity will appear here as teachers, students, finance, reports, and posts are created.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <RecentActivityRow key={item.id} item={item} now={now} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  description: string
  detail?: string
  icon: ComponentType<{ className?: string }>
}

function StatCard({ title, value, description, detail, icon: Icon }: StatCardProps) {
  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="min-w-0 text-sm font-medium leading-snug">{title}</CardTitle>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="break-words text-xl font-bold sm:text-2xl">{value}</div>
        <p className="break-words text-xs text-muted-foreground">{description}</p>
        {detail ? (
          <p className="mt-1 break-words text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SetupProgressItem({
  item,
  index,
}: {
  item: SetupItem
  index: number
}) {
  return (
    <Link
      href={item.href}
      className="block w-full overflow-hidden rounded-md border p-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            item.completed
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-primary/10 text-primary"
          }`}
        >
          {item.completed ? (
            <Check className="h-4 w-4" />
          ) : (
            <span className="text-xs font-semibold">{index}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-sm font-medium">{item.title}</p>
            <Badge
              variant={item.completed ? "success" : "secondary"}
              className="max-w-full break-all"
            >
              {item.metric}
            </Badge>
          </div>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {item.description}
          </p>
        </div>
      </div>
    </Link>
  )
}

function RecentActivityRow({
  item,
  now,
}: {
  item: RecentActivityItem
  now: Date
}) {
  const { icon: Icon, badgeVariant, badgeLabel } = getActivityMeta(item.type)

  return (
    <Link
      href={item.href}
      className="block w-full overflow-hidden rounded-lg border p-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="break-words text-sm font-medium sm:truncate">{item.title}</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {item.description}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:block sm:shrink-0 sm:text-right">
          <Badge variant={badgeVariant} className="shrink-0">
            {badgeLabel}
          </Badge>
          <p className="text-xs text-muted-foreground sm:mt-1">
            {formatRelativeDate(item.timestamp, now)}
          </p>
        </div>
      </div>
    </Link>
  )
}

function getActivityMeta(type: RecentActivityItem["type"]) {
  switch (type) {
    case "teacher":
      return {
        icon: GraduationCap,
        badgeVariant: "secondary" as const,
        badgeLabel: "Teacher",
      }
    case "student":
      return {
        icon: Users,
        badgeVariant: "secondary" as const,
        badgeLabel: "Student",
      }
    case "invoice":
      return {
        icon: Receipt,
        badgeVariant: "warning" as const,
        badgeLabel: "Invoice",
      }
    case "payment":
      return {
        icon: CreditCard,
        badgeVariant: "success" as const,
        badgeLabel: "Payment",
      }
    case "report":
      return {
        icon: FileText,
        badgeVariant: "outline" as const,
        badgeLabel: "Report",
      }
    case "post":
      return {
        icon: MessageSquare,
        badgeVariant: "outline" as const,
        badgeLabel: "Post",
      }
  }
}

function formatRelativeDate(
  date: Date | string | null | undefined,
  now: Date
) {
  if (!date) return "-"

  const safeDate = new Date(date)

  if (isNaN(safeDate.getTime())) return "invalid date"

  const diffMs = now.getTime() - safeDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day ago`
}
