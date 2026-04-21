"use client"

import { useRef, useState } from "react"
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AcademyLogo } from "@/components/ui/academy-logo"
import { UserAvatar } from "@/components/ui/user-avatar"

interface ImageUploadFieldProps {
  value?: string | null
  onChange: (value: string | null) => void
  uploadTarget: "user_avatar" | "academy_logo" | "course_syllabus_image"
  uploadEndpoint?: string
  disabled?: boolean
  shape?: "circle" | "square"
  title: string
  description: string
  previewName?: string
  previewColor?: string | null
  firstName?: string | null
  lastName?: string | null
  className?: string
}

export function ImageUploadField({
  value,
  onChange,
  uploadTarget,
  uploadEndpoint = "/api/uploads/profile-media",
  disabled = false,
  shape = "square",
  title,
  description,
  previewName,
  previewColor,
  firstName,
  lastName,
  className,
}: ImageUploadFieldProps) {
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

  const renderPreview = () => {
    if (shape === "circle") {
      return (
        <UserAvatar
          firstName={firstName}
          lastName={lastName}
          avatarUrl={value}
          className="h-20 w-20"
          fallbackClassName="text-xl"
          iconClassName="h-8 w-8"
        />
      )
    }

    return (
      <AcademyLogo
        name={previewName}
        logoUrl={value}
        primaryColor={previewColor}
        className="h-20 w-20"
        iconClassName="h-10 w-10"
      />
    )
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

      <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center justify-center">
          {renderPreview()}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, or WEBP up to 5MB
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
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
            {value ? "Replace Image" : "Upload Image"}
          </Button>

          {value ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={disabled || isUploading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!value ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          A fallback avatar or academy mark will be shown until you upload an image.
        </div>
      ) : null}
    </div>
  )
}
