"use client"

import { useRef, useState } from "react"
import { ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DocumentUploadFieldProps {
  value?: string | null
  onChange: (value: string | null) => void
  uploadTarget: "course_syllabus_pdf"
  uploadEndpoint: string
  accept?: string
  disabled?: boolean
  title: string
  description: string
  className?: string
}

export function DocumentUploadField({
  value,
  onChange,
  uploadTarget,
  uploadEndpoint,
  accept = "application/pdf",
  disabled = false,
  title,
  description,
  className,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("target", uploadTarget)

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      onChange(data.fileUrl)
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed"
      )
    } finally {
      setIsUploading(false)

      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleFileSelect}
      />

      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground">PDF up to 10MB</p>
          </div>
        </div>

        {value ? (
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-sm font-medium">Uploaded syllabus PDF</p>
            <p className="mt-1 break-all text-xs text-muted-foreground">
              {value}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(value, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(null)}
                disabled={disabled || isUploading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No syllabus PDF uploaded yet.</p>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {value ? "Replace PDF" : "Upload PDF"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}
