"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Save, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReportSectionsEditor, ReportSection } from "./report-sections-editor"
import { PublishReportDialog } from "./publish-report-dialog"

const reportTypes = [
  { value: "daily", label: "Daily Report" },
  { value: "weekly", label: "Weekly Report" },
  { value: "monthly", label: "Monthly Report" },
  { value: "term", label: "Term Report" },
]

const formSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  studentProfileId: z.string().min(1, "Student is required"),
  reportType: z.enum(["daily", "weekly", "monthly", "term"]),
  reportDate: z.string().min(1, "Report date is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
})

type FormValues = z.infer<typeof formSchema>

interface Class {
  id: string
  name: string
  course: {
    code: string
    name: string
  }
}

interface Student {
  id: string
  studentId: string
  user: {
    firstName: string
    lastName: string
  }
}

interface ReportFormProps {
  initialData?: Partial<FormValues> & {
    id?: string
    status?: string
    sections?: ReportSection[]
  }
  isEditing?: boolean
}

export function ReportForm({
  initialData,
  isEditing = false,
}: ReportFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [isLoadingClasses, setIsLoadingClasses] = useState(true)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [sections, setSections] = useState<ReportSection[]>(
    initialData?.sections || []
  )
  const [attendanceContext, setAttendanceContext] = useState<any>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  const formatDateForInput = (date: string | Date | undefined) => {
    if (!date) {
      return ""
    }

    return new Date(date).toISOString().split("T")[0]
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classId: initialData?.classId || "",
      studentProfileId: initialData?.studentProfileId || "",
      reportType: initialData?.reportType || "weekly",
      reportDate:
        formatDateForInput(initialData?.reportDate) ||
        new Date().toISOString().split("T")[0],
      periodStart: formatDateForInput(initialData?.periodStart) || "",
      periodEnd: formatDateForInput(initialData?.periodEnd) || "",
    },
  })

  const selectedClassId = form.watch("classId")
  const selectedStudentId = form.watch("studentProfileId")
  const periodStart = form.watch("periodStart")
  const periodEnd = form.watch("periodEnd")

  useEffect(() => {
    void fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      void fetchStudents(selectedClassId)
    } else {
      setStudents([])
    }
  }, [selectedClassId])

  useEffect(() => {
    if (selectedClassId && selectedStudentId && periodStart && periodEnd) {
      void fetchReportContext()
    }
  }, [selectedClassId, selectedStudentId, periodStart, periodEnd])

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/teacher/classes")
      const data = await response.json()
      setClasses(data.classes || [])
    } catch (fetchError) {
      console.error("Failed to fetch classes:", fetchError)
    } finally {
      setIsLoadingClasses(false)
    }
  }

  const fetchStudents = async (classId: string) => {
    setIsLoadingStudents(true)

    try {
      const response = await fetch(`/api/teacher/classes/${classId}/students`)
      const data = await response.json()
      setStudents(data.students || [])
    } catch (fetchError) {
      console.error("Failed to fetch students:", fetchError)
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const fetchReportContext = async () => {
    try {
      const response = await fetch(
        `/api/teacher/classes/${selectedClassId}/students/${selectedStudentId}/report-context?periodStart=${periodStart}&periodEnd=${periodEnd}`
      )
      const data = await response.json()

      if (data.attendance) {
        setAttendanceContext(data.attendance)

        setSections((previousSections) => {
          const attendanceSectionIndex = previousSections.findIndex(
            (section) => section.sectionType === "attendance"
          )

          if (attendanceSectionIndex === -1) {
            return previousSections
          }

          const updatedSections = [...previousSections]
          updatedSections[attendanceSectionIndex] = {
            ...updatedSections[attendanceSectionIndex],
            contentJson: data.attendance,
          }

          return updatedSections
        })
      }
    } catch (fetchError) {
      console.error("Failed to fetch report context:", fetchError)
    }
  }

  const getPayload = (values: FormValues) => ({
    ...values,
    sections: sections.map((section, orderIndex) => ({ ...section, orderIndex })),
  })

  async function saveAsDraft() {
    const isValid = await form.trigger()

    if (!isValid) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const values = form.getValues()
      const url =
        isEditing && initialData?.id
          ? `/api/teacher/reports/${initialData.id}`
          : "/api/teacher/reports"
      const method = isEditing ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload(values)),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save report")
      }

      router.push("/teacher/reports")
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "An error occurred"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePublish(publishDate?: Date) {
    const isValid = await form.trigger()

    if (!isValid) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const values = form.getValues()
      const url =
        isEditing && initialData?.id
          ? `/api/teacher/reports/${initialData.id}`
          : "/api/teacher/reports"
      const method = isEditing ? "PATCH" : "POST"

      const saveResponse = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload(values)),
      })

      const saveData = await saveResponse.json()

      if (!saveResponse.ok) {
        throw new Error(saveData.error || "Failed to save report")
      }

      const reportId = saveData.report?.id || initialData?.id

      const publishResponse = await fetch(
        `/api/teacher/reports/${reportId}/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publishDate }),
        }
      )

      const publishData = await publishResponse.json()

      if (!publishResponse.ok) {
        throw new Error(publishData.error || "Failed to publish report")
      }

      router.push("/teacher/reports")
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "An error occurred"
      )
    } finally {
      setIsLoading(false)
      setShowPublishDialog(false)
    }
  }

  return (
    <>
      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
              <CardDescription>
                Select the class, student, and reporting period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading || isEditing || isLoadingClasses}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.course.code}: {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="studentProfileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={
                          isLoading ||
                          isEditing ||
                          !selectedClassId ||
                          isLoadingStudents
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.user.firstName} {student.user.lastName} (
                              {student.studentId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {reportTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reportDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Date *</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="periodStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period Start *</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={isLoading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="periodEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period End *</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={isLoading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Sections</CardTitle>
              <CardDescription>
                Add and organize sections for this report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportSectionsEditor
                sections={sections}
                onChange={setSections}
                attendanceContext={attendanceContext}
                disabled={isLoading || isSaving}
              />
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading || isSaving}
            >
              Cancel
            </Button>
            {!isEditing || initialData?.status === "draft" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveAsDraft}
                  disabled={isLoading || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Draft
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowPublishDialog(true)}
                  disabled={isLoading || isSaving || sections.length === 0}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Publish Report
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={saveAsDraft}
                disabled={isLoading || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            )}
          </div>
        </form>
      </Form>

      <PublishReportDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        onConfirm={handlePublish}
        isLoading={isLoading}
      />
    </>
  )
}
