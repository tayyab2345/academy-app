"use client"

import { useRef, useState } from "react"
import { ExternalLink, ImageIcon, Loader2, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PostImageUploadFieldProps {
  value?: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  className?: string
}

export function PostImageUploadField({
  value,
  onChange,
  disabled = false,
  className,
}: PostImageUploadFieldProps) {
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
      formData.append("target", "post_image")

      const response = await fetch("/api/uploads/post-images", {
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
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleFileSelect}
      />

      {value ? (
        <div className="space-y-3 rounded-xl border p-4">
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-lg border bg-muted/30"
          >
            <img
              src={value}
              alt="Announcement image preview"
              className="max-h-80 w-full object-contain"
            />
          </a>

          <div className="flex flex-wrap gap-2">
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
              Replace Image
            </Button>

            <Button
              type="button"
              variant="ghost"
              asChild
            >
              <a href={value} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Full Size
              </a>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={disabled || isUploading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border p-4">
          <div className="mb-4 flex aspect-[16/9] items-center justify-center rounded-lg border border-dashed bg-muted/30">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="mx-auto mb-2 h-8 w-8" />
              <p className="text-sm font-medium">No image selected</p>
              <p className="text-xs">PNG, JPG, or WEBP up to 5MB</p>
            </div>
          </div>

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
            Upload Image
          </Button>
        </div>
      )}

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}
