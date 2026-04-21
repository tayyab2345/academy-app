"use client"

import type { ComponentProps, ReactNode } from "react"
import { useState } from "react"
import { AlertCircle, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DocumentActionButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick" | "children"> {
  downloadUrl: string
  generateUrl?: string
  icon?: ReactNode
  label?: string
}

export function DocumentActionButton({
  downloadUrl,
  generateUrl,
  icon,
  label = "Download PDF",
  ...buttonProps
}: DocumentActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleClick = async () => {
    setIsLoading(true)

    try {
      if (generateUrl) {
        const response = await fetch(generateUrl, {
          method: "POST",
        })

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null

        if (!response.ok) {
          throw new Error(data?.error || "Failed to prepare document")
        }
      }

      window.open(downloadUrl, "_blank", "noopener,noreferrer")
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to open document"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button {...buttonProps} onClick={handleClick} disabled={isLoading || buttonProps.disabled}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          icon || <Download className="h-4 w-4" />
        )}
        {label ? <span className="ml-2">{label}</span> : null}
      </Button>

      <Dialog open={Boolean(errorMessage)} onOpenChange={() => setErrorMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Document Error
            </DialogTitle>
            <DialogDescription>
              {errorMessage || "Failed to open the document."}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
