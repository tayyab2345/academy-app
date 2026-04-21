import Link from "next/link"
import { Download, ExternalLink, FileImage, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface CourseSyllabusPanelProps {
  courseName: string
  syllabusPdfUrl?: string | null
  syllabusImageUrl?: string | null
  title?: string
  description?: string
  emptyMessage?: string
  variant?: "card" | "inline"
  className?: string
}

export function CourseSyllabusPanel({
  courseName,
  syllabusPdfUrl,
  syllabusImageUrl,
  title = "Course Syllabus",
  description = "Understand what will be taught in this course.",
  emptyMessage = "No syllabus uploaded yet.",
  variant = "card",
  className,
}: CourseSyllabusPanelProps) {
  const hasContent = Boolean(syllabusPdfUrl || syllabusImageUrl)

  const content = (
    <div className="space-y-4">
      {hasContent ? (
        <>
          {syllabusPdfUrl ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={syllabusPdfUrl} target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View PDF
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`${syllabusPdfUrl}?download=1`} target="_blank">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Link>
              </Button>
            </div>
          ) : null}

          {syllabusImageUrl ? (
            <div className="overflow-hidden rounded-lg border bg-muted/10">
              <img
                src={syllabusImageUrl}
                alt={`${courseName} syllabus preview`}
                className="max-h-80 w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  )

  if (variant === "inline") {
    return (
      <div className={cn("space-y-3 rounded-lg border bg-muted/10 p-4", className)}>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {syllabusImageUrl ? (
              <FileImage className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            {title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {content}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
