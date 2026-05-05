import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function MobileCards({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("space-y-3 md:hidden", className)}>{children}</div>
}

export function MobileListCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-2xl border bg-card p-4 shadow-sm",
        "ring-1 ring-border/40",
        className
      )}
    >
      {children}
    </div>
  )
}

export function MobileDetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 break-words text-right font-medium text-foreground">
        {children}
      </div>
    </div>
  )
}

export function MobileEmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-4 py-8 text-center md:hidden">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export function DesktopTableShell({ children }: { children: ReactNode }) {
  return <div className="hidden overflow-x-auto rounded-md border md:block">{children}</div>
}

