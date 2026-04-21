"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AlertTriangle, Loader2, ShieldAlert, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ACADEMY_DELETE_CONFIRMATION_TEXT } from "@/lib/academy-deletion"

interface DeleteAcademyDialogProps {
  academyName: string
  summary: {
    teachers: number
    students: number
    parents: number
    classes: number
  }
  recoveryWindowDays: number
}

export function DeleteAcademyDialog({
  academyName,
  summary,
  recoveryWindowDays,
}: DeleteAcademyDialogProps) {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmationText, setConfirmationText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canConfirm = useMemo(
    () => confirmationText.trim() === ACADEMY_DELETE_CONFIRMATION_TEXT,
    [confirmationText]
  )

  async function handleDeleteAcademy() {
    if (!canConfirm) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/academy", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to deactivate academy")
      }

      await update({
        ...session,
        user: {
          ...session?.user,
          academy: {
            ...session?.user.academy,
            isDeleted: true,
            deletedAt: data.academy.deletedAt,
          },
        },
      })

      setOpen(false)
      router.push("/academy-deactivated?from=delete")
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to deactivate academy"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setConfirmationText("")
          setError(null)
          setIsSubmitting(false)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Academy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Deactivate {academyName}
          </DialogTitle>
          <DialogDescription>
            This is a soft delete. Your academy and its data will be deactivated,
            dashboard access will be blocked, and recovery stays available for{" "}
            {recoveryWindowDays} days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Step 1: Review the impact</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                This will deactivate your academy and all associated data. No
                records are deleted immediately, but users will lose dashboard
                access until the academy is restored.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ImpactStat label="Teachers" value={summary.teachers} />
                <ImpactStat label="Students" value={summary.students} />
                <ImpactStat label="Parents" value={summary.parents} />
                <ImpactStat label="Classes" value={summary.classes} />
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm font-medium">Step 2: Type the confirmation text</p>
            <p className="text-sm text-muted-foreground">
              To continue, type <span className="font-semibold">{ACADEMY_DELETE_CONFIRMATION_TEXT}</span>
            </p>
            <Input
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              placeholder={ACADEMY_DELETE_CONFIRMATION_TEXT}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Step 3: Confirm deactivation</p>
            <p className="text-sm text-muted-foreground">
              The final action stays disabled until the exact confirmation text
              is entered.
            </p>
          </div>

          {error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteAcademy}
            disabled={!canConfirm || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Deactivate Academy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImpactStat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
