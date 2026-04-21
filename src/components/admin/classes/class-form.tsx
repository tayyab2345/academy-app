"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import {
  CLASS_WEEKDAY_VALUES,
  getClassWeekdayLabel,
} from "@/lib/class-schedule"

const academicYears = [
  "2023-2024",
  "2024-2025",
  "2025-2026",
  "2026-2027",
]

const formSchema = z
  .object({
    courseId: z.string().min(1, "Course is required"),
    name: z.string().min(2, "Class name must be at least 2 characters"),
    section: z.string().optional(),
    academicYear: z.string().min(1, "Academic year is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    teacherProfileId: z.string().optional(),
    scheduleDays: z.array(z.enum(CLASS_WEEKDAY_VALUES)).default([]),
    scheduleStartTime: z.string().optional(),
    scheduleEndTime: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endDate).getTime() < new Date(data.startDate).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after the start date",
        path: ["endDate"],
      })
    }

    const hasAnyScheduleField =
      data.scheduleDays.length > 0 ||
      Boolean(data.scheduleStartTime) ||
      Boolean(data.scheduleEndTime)

    if (!hasAnyScheduleField) {
      return
    }

    if (data.scheduleDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one class day",
        path: ["scheduleDays"],
      })
    }

    if (!data.scheduleStartTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start time is required when a schedule is configured",
        path: ["scheduleStartTime"],
      })
    }

    if (!data.scheduleEndTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time is required when a schedule is configured",
        path: ["scheduleEndTime"],
      })
    }

    if (
      data.scheduleStartTime &&
      data.scheduleEndTime &&
      data.scheduleEndTime <= data.scheduleStartTime
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be later than the start time",
        path: ["scheduleEndTime"],
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

interface Course {
  id: string
  code: string
  name: string
  gradeLevel: string
}

interface TeacherOption {
  id: string
  employeeId: string | null
  user: {
    firstName: string
    lastName: string
    email: string
    isActive: boolean
  }
}

interface ClassFormProps {
  initialData?: Partial<FormValues> & {
    id?: string
    status?: string
  }
  isEditing?: boolean
  courses: Course[]
  teacherOptions: TeacherOption[]
}

export function ClassForm({
  initialData,
  isEditing = false,
  courses,
  teacherOptions,
}: ClassFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatDateForInput = (date: string | Date | undefined) => {
    if (!date) return ""
    const d = new Date(date)
    return d.toISOString().split("T")[0]
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: initialData?.courseId || "",
      name: initialData?.name || "",
      section: initialData?.section || "",
      academicYear: initialData?.academicYear || "2024-2025",
      startDate: formatDateForInput(initialData?.startDate) || "",
      endDate: formatDateForInput(initialData?.endDate) || "",
      teacherProfileId: initialData?.teacherProfileId || "",
      scheduleDays: initialData?.scheduleDays || [],
      scheduleStartTime: initialData?.scheduleStartTime || "",
      scheduleEndTime: initialData?.scheduleEndTime || "",
    },
  })

  const teacherComboboxOptions = teacherOptions.map((teacher) => ({
    value: teacher.id,
    label: `${teacher.user.firstName} ${teacher.user.lastName}${
      teacher.employeeId ? ` (${teacher.employeeId})` : ""
    } - ${teacher.user.email}${teacher.user.isActive ? "" : " [Inactive]"}`,
  }))
  const activeTeacherCount = teacherOptions.filter(
    (teacher) => teacher.user.isActive
  ).length

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const url = isEditing && initialData?.id
        ? `/api/admin/classes/${initialData.id}`
        : "/api/admin/classes"

      const method = isEditing ? "PATCH" : "POST"
      const submitValues = {
        ...values,
        teacherProfileId: values.teacherProfileId || undefined,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitValues),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save class")
      }

      router.push("/admin/classes")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Class Information</CardTitle>
            <CardDescription>
              Create a class based on an existing course
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading || isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.name} ({course.gradeLevel})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <FormDescription>
                      Course cannot be changed after creation
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Algebra I - Morning" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <FormControl>
                      <Input placeholder="A" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription>Optional section identifier</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="teacherProfileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Teacher</FormLabel>
                  <FormControl>
                    <Combobox
                      options={teacherComboboxOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={
                        activeTeacherCount > 0
                          ? "Select a primary teacher"
                          : "No active teachers available"
                      }
                      emptyText="No active teachers available for assignment."
                      disabled={isLoading || teacherOptions.length === 0}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose the main teacher for this class. You can add assistant
                    teachers later from the class detail page.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {activeTeacherCount === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                No active teachers available for assignment.
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="academicYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Year *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date *</FormLabel>
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
            <CardTitle>Recurring Schedule</CardTitle>
            <CardDescription>
              Set the weekly days and time students, parents, teachers, and admins
              should see for this class.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="scheduleDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Days</FormLabel>
                  <FormDescription>
                    Leave blank if the recurring schedule is not configured yet.
                  </FormDescription>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {CLASS_WEEKDAY_VALUES.map((day) => {
                      const checked = field.value?.includes(day) || false

                      return (
                        <label
                          key={day}
                          className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) => {
                              const nextValue = nextChecked
                                ? [...(field.value || []), day]
                                : (field.value || []).filter(
                                    (currentDay) => currentDay !== day
                                  )

                              field.onChange(nextValue)
                            }}
                            disabled={isLoading}
                          />
                          <span>{getClassWeekdayLabel(day, "long")}</span>
                        </label>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduleStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduleEndTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditing ? "Save Changes" : "Create Class"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
