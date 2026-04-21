"use client"

import { useState } from "react"
import { Calendar, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PublishReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (publishDate?: Date) => Promise<void>
  isLoading?: boolean
}

export function PublishReportDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: PublishReportDialogProps) {
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [publishDate, setPublishDate] = useState(
    new Date().toISOString().split("T")[0]
  )

  const handleConfirm = async () => {
    await onConfirm(useCustomDate ? new Date(publishDate) : undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish Report</DialogTitle>
          <DialogDescription>
            Once published, this report will be visible to the student and their
            parents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="customDate"
              checked={useCustomDate}
              onChange={(event) => setUseCustomDate(event.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="customDate" className="text-sm">
              Set custom publish date
            </Label>
          </div>

          {useCustomDate && (
            <div className="space-y-2">
              <Label htmlFor="publishDate">Publish Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="publishDate"
                  type="date"
                  value={publishDate}
                  onChange={(event) => setPublishDate(event.target.value)}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The report will show this as the publication date.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm">
              <span className="font-medium">After publishing:</span>
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>The report will be visible to the student</li>
              <li>Linked parents will be able to view it</li>
              <li>You can still archive it later if needed</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            <Send className="mr-2 h-4 w-4" />
            {isLoading ? "Publishing..." : "Publish Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
