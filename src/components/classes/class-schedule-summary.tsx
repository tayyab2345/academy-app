import { CalendarDays, Clock, Repeat, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  formatClassScheduleTimeRange,
  getClassRecurrenceLabel,
  getClassWeekdayLabel,
  hasConfiguredClassSchedule,
  sortClassScheduleDays,
  type ClassScheduleShape,
} from "@/lib/class-schedule"
import { cn } from "@/lib/utils"

interface ClassScheduleSummaryProps extends ClassScheduleShape {
  teacherName?: string | null
  emptyMessage?: string
  variant?: "compact" | "detailed"
  className?: string
}

export function ClassScheduleSummary({
  scheduleDays,
  scheduleStartTime,
  scheduleEndTime,
  scheduleRecurrence,
  teacherName,
  emptyMessage = "Recurring schedule not configured yet.",
  variant = "compact",
  className,
}: ClassScheduleSummaryProps) {
  const schedule = {
    scheduleDays,
    scheduleStartTime,
    scheduleEndTime,
    scheduleRecurrence,
  }

  if (!hasConfiguredClassSchedule(schedule)) {
    if (variant === "compact") {
      return (
        <p className={cn("text-xs text-muted-foreground", className)}>
          {emptyMessage}
        </p>
      )
    }

    return (
      <div
        className={cn(
          "rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground",
          className
        )}
      >
        {emptyMessage}
      </div>
    )
  }

  const sortedDays = sortClassScheduleDays(scheduleDays)
  const timeRange = formatClassScheduleTimeRange(
    scheduleStartTime,
    scheduleEndTime
  )
  const recurrenceLabel = getClassRecurrenceLabel(scheduleRecurrence)

  if (variant === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex flex-wrap gap-1.5">
          {sortedDays.map((day) => (
            <Badge key={day} variant="secondary" className="text-[11px]">
              {getClassWeekdayLabel(day, "short")}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {timeRange ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeRange}
            </span>
          ) : null}
          {teacherName ? (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {teacherName}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Weekly days
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedDays.map((day) => (
              <Badge key={day} variant="secondary">
                {getClassWeekdayLabel(day, "long")}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Time
          </div>
          <p className="text-sm font-medium">{timeRange}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Repeat className="h-4 w-4" />
            <span>{recurrenceLabel}</span>
          </div>
        </div>
      </div>

      {teacherName ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{teacherName}</span>
        </div>
      ) : null}
    </div>
  )
}
