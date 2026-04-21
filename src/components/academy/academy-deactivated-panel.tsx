"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  ShieldAlert,
  LogOut,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface AcademyDeactivatedPanelProps {
  academyName: string | null
  deletedAt: string | null
  recoveryDeadline: string | null
  recoveryAvailable: boolean
  canRestore: boolean
}

export function AcademyDeactivatedPanel({
  academyName,
  deletedAt,
  recoveryDeadline,
  recoveryAvailable,
  canRestore,
}: AcademyDeactivatedPanelProps) {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isRestoring, setIsRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasSession = Boolean(session?.user)

  async function handleRestore() {
    setIsRestoring(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/academy/restore", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to restore academy")
      }

      await update({
        ...session,
        user: {
          ...session?.user,
          academy: {
            ...session?.user.academy,
            name: data.academy.name,
            logoUrl: data.academy.logoUrl,
            primaryColor: data.academy.primaryColor,
            contactEmail: data.academy.contactEmail,
            isDeleted: false,
            deletedAt: null,
          },
        },
      })

      router.push("/admin")
      router.refresh()
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Failed to restore academy"
      )
    } finally {
      setIsRestoring(false)
    }
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6">
      <Card className="w-full border-destructive/25 shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Academy Deactivated</CardTitle>
              <CardDescription>
                {academyName
                  ? `${academyName} is currently deactivated.`
                  : "This academy is currently deactivated."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Dashboard access is blocked</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                The academy has been soft deleted for safety. Data remains in the
                database, but dashboard access and new activity stay disabled
                until the academy is restored.
              </p>
              <p>
                No permanent hard delete happens immediately. Any later cleanup
                should only happen after the recovery window through a separate
                controlled process.
              </p>
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoBlock
              label="Deactivated on"
              value={deletedAt ? formatDateTime(deletedAt) : "Unavailable"}
            />
            <InfoBlock
              label="Restore deadline"
              value={
                recoveryDeadline
                  ? formatDateTime(recoveryDeadline)
                  : "Unavailable"
              }
            />
          </div>

          {!hasSession ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="font-semibold">Sign in is currently blocked</h3>
              <p className="text-sm text-muted-foreground">
                Only an academy admin can restore access during the recovery
                window. Once the academy is active again, users can sign in
                normally.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link href="/login">Back to Sign In</Link>
                </Button>
              </div>
            </div>
          ) : canRestore ? (
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
              <div>
                <h3 className="font-semibold">Restore access</h3>
                <p className="text-sm text-muted-foreground">
                  You are signed in as an admin, and the academy is still within
                  the recovery window.
                </p>
              </div>

              {error ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={handleRestore}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Restore Academy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={isRestoring}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          ) : recoveryAvailable ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="font-semibold">Waiting for admin restore</h3>
              <p className="text-sm text-muted-foreground">
                An academy admin can restore access before the recovery window
                ends. Until then, all users remain blocked from the dashboard.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/login">Back to Sign In</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="font-semibold">Recovery window expired</h3>
              <p className="text-sm text-muted-foreground">
                This academy is no longer within its self-service recovery
                window. Contact platform support before any permanent cleanup is
                considered.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/login">Back to Sign In</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoBlock({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  )
}

function formatDateTime(value: string) {
  const safeDate = new Date(value)

  if (Number.isNaN(safeDate.getTime())) {
    return "Unavailable"
  }

  return safeDate.toLocaleString()
}
