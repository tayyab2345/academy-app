import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/10 p-6">
      <div className="rounded-2xl border bg-background px-6 py-5 text-center shadow-sm">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          Preparing your dashboard
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          We are confirming your secure academy session.
        </p>
      </div>
    </div>
  )
}
