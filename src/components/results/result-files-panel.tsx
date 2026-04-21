"use client"

import { Download, ExternalLink, FileImage, FileText } from "lucide-react"
import { ResultFileType } from "@prisma/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { resultFileTypeLabels } from "@/lib/results/result-utils"

interface ResultFileItem {
  id: string
  fileUrl: string
  fileType: string
  mimeType: string
  createdAt: string
  uploadedBy: {
    firstName: string
    lastName: string
  }
  studentProfile?: {
    id: string
    studentId: string
    user: {
      firstName: string
      lastName: string
    }
  } | null
}

interface ResultFilesPanelProps {
  files: ResultFileItem[]
  title?: string
  description?: string
  emptyMessage?: string
  onDelete?: (fileId: string) => void
  deletingFileId?: string | null
}

export function ResultFilesPanel({
  files,
  title = "Result Files",
  description = "Uploaded marksheets, reports, and result attachments.",
  emptyMessage = "No result files uploaded yet.",
  onDelete,
  deletingFileId,
}: ResultFilesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => {
              const isImage = file.mimeType.startsWith("image/")
              const label =
                resultFileTypeLabels[file.fileType as ResultFileType] || file.fileType

              return (
                <div
                  key={file.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{label}</Badge>
                        {file.studentProfile ? (
                          <Badge variant="secondary">
                            {file.studentProfile.user.firstName}{" "}
                            {file.studentProfile.user.lastName}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Whole Class</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Uploaded by {file.uploadedBy.firstName} {file.uploadedBy.lastName} on{" "}
                        {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                      {isImage ? (
                        <div className="overflow-hidden rounded-lg border bg-muted/20">
                          <img
                            src={file.fileUrl}
                            alt={label}
                            className="max-h-72 w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          PDF attachment
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.fileUrl, "_blank", "noopener,noreferrer")}
                      >
                        {isImage ? (
                          <FileImage className="mr-2 h-4 w-4" />
                        ) : (
                          <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.fileUrl, "_blank", "noopener,noreferrer")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      {onDelete ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(file.id)}
                          disabled={deletingFileId === file.id}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
