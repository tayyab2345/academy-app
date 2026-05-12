"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock } from "lucide-react"
import {
  formatDateTimeRangeInZone,
  getReadableTimeZoneLabel,
  safeResolveBrowserTimeZone,
} from "@/lib/time-zone-labels"
import { resolveAcademyTimeZone } from "@/lib/time-zone"
import { cn } from "@/lib/utils"

interface TimeZoneAwareSessionTimeProps {
  startTime: Date | string
  endTime?: Date | string | null
  academyTimeZone?: string | null
  className?: string
  showIcon?: boolean
  compact?: boolean
}

export function TimeZoneAwareSessionTime({
  startTime,
  endTime,
  academyTimeZone,
  className,
  showIcon = true,
  compact = false,
}: TimeZoneAwareSessionTimeProps) {
  const resolvedAcademyTimeZone = resolveAcademyTimeZone(academyTimeZone)
  const [browserTimeZone, setBrowserTimeZone] = useState<string | null>(null)

  useEffect(() => {
    setBrowserTimeZone(
      safeResolveBrowserTimeZone(
        Intl.DateTimeFormat().resolvedOptions().timeZone
      )
    )
  }, [])

  const academyLabel = getReadableTimeZoneLabel(resolvedAcademyTimeZone)
  const academyTime = useMemo(
    () =>
      formatDateTimeRangeInZone({
        startTime,
        endTime,
        timeZone: resolvedAcademyTimeZone,
      }),
    [academyTimeZone, endTime, resolvedAcademyTimeZone, startTime]
  )
  const shouldShowLocalTime =
    browserTimeZone && browserTimeZone !== resolvedAcademyTimeZone
  const browserLabel = shouldShowLocalTime
    ? getReadableTimeZoneLabel(browserTimeZone)
    : null
  const browserTime = shouldShowLocalTime
    ? formatDateTimeRangeInZone({
        startTime,
        endTime,
        timeZone: browserTimeZone,
      })
    : null

  return (
    <div
      className={cn(
        "min-w-0 text-sm text-muted-foreground",
        compact ? "space-y-0.5" : "space-y-1",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        {showIcon ? <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
        <span className="min-w-0 break-words">
          {shouldShowLocalTime ? (
            <>
              <span className="font-medium text-foreground">Academy time:</span>{" "}
              {academyTime} ({academyLabel})
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{academyLabel}:</span>{" "}
              {academyTime}
            </>
          )}
        </span>
      </div>
      {browserTime && browserLabel ? (
        <div className="flex min-w-0 items-start gap-1.5 pl-5">
          <span className="min-w-0 break-words">
            <span className="font-medium text-foreground">Your time:</span>{" "}
            {browserTime} ({browserLabel})
          </span>
        </div>
      ) : null}
    </div>
  )
}
