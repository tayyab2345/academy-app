"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DashboardErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardErrorPage({
  error,
  reset,
}: DashboardErrorPageProps) {
  useEffect(() => {
    console.error("[dashboard-error-boundary]", {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle>We could not load this dashboard page</CardTitle>
          <CardDescription>
            Your account is safe. Please try again, or go back to the home page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
              Error reference: {error.digest}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Go to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
