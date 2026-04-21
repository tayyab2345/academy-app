"use client"

import { useRef, useState } from "react"
import { Eye, FileImage, Loader2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ReceiptUploadFieldProps {
  value?: string
  onChange: (url: string | undefined) => void
  disabled?: boolean
  className?: string
}

export function ReceiptUploadField({
  value,
  onChange,
  disabled = false,
  className,
}: ReceiptUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPdf = preview?.toLowerCase().includes(".pdf") || false

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB")
      return
    }

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Only images and PDF files are allowed")
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/uploads/payment-receipts", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      setPreview(data.fileUrl)
      onChange(data.fileUrl)
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed"
      )
    } finally {
      setIsUploading(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  function handleRemove() {
    setPreview(null)
    setError(null)
    onChange(undefined)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {preview ? (
        <>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <FileImage className="h-8 w-8 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {isPdf ? "Receipt PDF" : "Receipt Image"}
              </p>
              <p className="text-xs text-muted-foreground">
                Uploaded successfully
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => window.open(preview, "_blank", "noopener,noreferrer")}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isPdf && (
            <div className="overflow-hidden rounded-lg border">
              <img
                src={preview}
                alt="Receipt preview"
                className="h-40 w-full object-cover"
              />
            </div>
          )}
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="h-24 w-full border-dashed"
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="mb-1 h-6 w-6 animate-spin" />
              <span className="text-sm">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="mb-1 h-6 w-6" />
              <span className="text-sm font-medium">Click to upload receipt</span>
              <span className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, WEBP or PDF (max 5MB)
              </span>
            </div>
          )}
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
