"use client"

import { useState } from "react"
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Star,
  Calendar,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Target,
  MessageSquare,
  Heart,
  GraduationCap,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

export interface ReportSection {
  id?: string
  sectionType: string
  content: string
  contentJson?: any
  rating: number | null
  orderIndex: number
}

interface ReportSectionsEditorProps {
  sections: ReportSection[]
  onChange: (sections: ReportSection[]) => void
  attendanceContext?: {
    totalSessions: number
    present: number
    absent: number
    late: number
  } | null
  disabled?: boolean
}

const sectionTypeConfig: Record<
  string,
  {
    label: string
    icon: React.ReactNode
    description: string
    supportsRating: boolean
    placeholder: string
  }
> = {
  attendance: {
    label: "Attendance",
    icon: <Calendar className="h-4 w-4" />,
    description: "Record attendance summary for the period",
    supportsRating: false,
    placeholder: "Summarize attendance patterns...",
  },
  homework: {
    label: "Homework Completion",
    icon: <BookOpen className="h-4 w-4" />,
    description: "Evaluate homework submission and quality",
    supportsRating: true,
    placeholder: "Describe homework performance...",
  },
  strengths: {
    label: "Strengths",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Highlight student's strengths and achievements",
    supportsRating: true,
    placeholder: "What are the student's key strengths?",
  },
  improvements: {
    label: "Areas for Improvement",
    icon: <AlertCircle className="h-4 w-4" />,
    description: "Identify areas where the student can improve",
    supportsRating: true,
    placeholder: "What areas need attention?",
  },
  next_focus: {
    label: "Next Focus",
    icon: <Target className="h-4 w-4" />,
    description: "Set goals for the next period",
    supportsRating: false,
    placeholder: "What should the student focus on next?",
  },
  teacher_remarks: {
    label: "Teacher Remarks",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "General comments from the teacher",
    supportsRating: true,
    placeholder: "Additional observations and comments...",
  },
  behavior: {
    label: "Behavior",
    icon: <Heart className="h-4 w-4" />,
    description: "Assess classroom behavior and conduct",
    supportsRating: true,
    placeholder: "Describe behavior and conduct...",
  },
  grades: {
    label: "Grades",
    icon: <GraduationCap className="h-4 w-4" />,
    description: "Record grades and assessments",
    supportsRating: false,
    placeholder: "List grades or assessment results...",
  },
}

export function ReportSectionsEditor({
  sections,
  onChange,
  attendanceContext,
  disabled = false,
}: ReportSectionsEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([0])
  )

  const availableSectionTypes = Object.keys(sectionTypeConfig).filter(
    (type) => !sections.some((section) => section.sectionType === type)
  )

  const addSection = (sectionType: string) => {
    const newSection: ReportSection = {
      sectionType,
      content: "",
      contentJson:
        sectionType === "attendance" && attendanceContext
          ? attendanceContext
          : undefined,
      rating: null,
      orderIndex: sections.length,
    }

    onChange([...sections, newSection])
    setExpandedSections((previous) => new Set([...previous, sections.length]))
  }

  const removeSection = (index: number) => {
    const newSections = sections.filter((_, sectionIndex) => sectionIndex !== index)
    onChange(newSections.map((section, orderIndex) => ({ ...section, orderIndex })))

    setExpandedSections((previous) => {
      const next = new Set<number>()
      previous.forEach((expandedIndex) => {
        if (expandedIndex < index) {
          next.add(expandedIndex)
        } else if (expandedIndex > index) {
          next.add(expandedIndex - 1)
        }
      })

      if (next.size === 0 && newSections.length > 0) {
        next.add(Math.min(index, newSections.length - 1))
      }

      return next
    })
  }

  const updateSection = (index: number, updates: Partial<ReportSection>) => {
    const newSections = [...sections]
    newSections[index] = { ...newSections[index], ...updates }
    onChange(newSections)
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) {
      return
    }

    if (direction === "down" && index === sections.length - 1) {
      return
    }

    const newSections = [...sections]
    const swapIndex = direction === "up" ? index - 1 : index + 1

    ;[newSections[index], newSections[swapIndex]] = [
      newSections[swapIndex],
      newSections[index],
    ]

    onChange(newSections.map((section, orderIndex) => ({ ...section, orderIndex })))

    setExpandedSections((previous) => {
      const next = new Set<number>()

      previous.forEach((expandedIndex) => {
        if (expandedIndex === index) {
          next.add(swapIndex)
        } else if (expandedIndex === swapIndex) {
          next.add(index)
        } else {
          next.add(expandedIndex)
        }
      })

      return next
    })
  }

  const toggleExpanded = (index: number) => {
    setExpandedSections((previous) => {
      const next = new Set(previous)

      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }

      return next
    })
  }

  const renderRatingInput = (index: number, rating: number | null) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => updateSection(index, { rating: star })}
            disabled={disabled}
            className="focus:outline-none"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                rating && star <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground hover:text-yellow-400"
              }`}
            />
          </button>
        ))}
        {rating && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => updateSection(index, { rating: null })}
            disabled={disabled}
            className="ml-2"
          >
            Clear
          </Button>
        )}
      </div>
    )
  }

  const renderAttendancePreview = (section: ReportSection) => {
    if (section.sectionType !== "attendance" || !section.contentJson) {
      return null
    }

    const data = section.contentJson

    return (
      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="rounded bg-muted p-2 text-center">
          <p className="text-lg font-bold">{data.totalSessions || 0}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded bg-green-50 p-2 text-center dark:bg-green-950/20">
          <p className="text-lg font-bold text-green-600">{data.present || 0}</p>
          <p className="text-xs text-muted-foreground">Present</p>
        </div>
        <div className="rounded bg-yellow-50 p-2 text-center dark:bg-yellow-950/20">
          <p className="text-lg font-bold text-yellow-600">{data.late || 0}</p>
          <p className="text-xs text-muted-foreground">Late</p>
        </div>
        <div className="rounded bg-red-50 p-2 text-center dark:bg-red-950/20">
          <p className="text-lg font-bold text-red-600">{data.absent || 0}</p>
          <p className="text-xs text-muted-foreground">Absent</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => {
        const config = sectionTypeConfig[section.sectionType]
        const isExpanded = expandedSections.has(index)

        return (
          <Card key={section.id ?? section.sectionType}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(index)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSection(index, "up")}
                        disabled={disabled || index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSection(index, "down")}
                        disabled={disabled || index === sections.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <CardTitle className="text-base">{config.label}</CardTitle>
                      {section.rating && (
                        <Badge variant="outline" className="ml-2">
                          {section.rating}/5
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeSection(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {config.description}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <Label>Comments</Label>
                      <Textarea
                        value={section.content}
                        onChange={(event) =>
                          updateSection(index, { content: event.target.value })
                        }
                        placeholder={config.placeholder}
                        disabled={disabled}
                        className="mt-1 min-h-[100px]"
                      />
                    </div>

                    {config.supportsRating && (
                      <div>
                        <Label>Rating (Optional)</Label>
                        <div className="mt-1">
                          {renderRatingInput(index, section.rating)}
                        </div>
                      </div>
                    )}

                    {section.sectionType === "attendance" &&
                      renderAttendancePreview(section)}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}

      {availableSectionTypes.length > 0 && !disabled && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Add section:</span>
              {availableSectionTypes.map((type) => {
                const config = sectionTypeConfig[type]

                return (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection(type)}
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    {config.label}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {sections.length === 0 && (
        <div className="rounded-lg border py-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No sections added yet. Add sections using the buttons above.
          </p>
        </div>
      )}
    </div>
  )
}
