"use client"

import { useEffect, useMemo, useState } from "react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CLASS_WEEKDAY_VALUES,
  getClassWeekdayLabel,
} from "@/lib/class-schedule"
import { UserAvatar } from "@/components/ui/user-avatar"

const meetingPlatforms = [
  { value: "in_person", label: "In Person" },
  { value: "zoom", label: "Zoom" },
  { value: "google_meet", label: "Google Meet" },
  { value: "teams", label: "Microsoft Teams" },
] as const

const formSchema = z
  .object({
    courseId: z.string().min(1, "Course is required"),
    name: z.string().min(2, "Class name must be at least 2 characters"),
    section: z.string().optional(),
    academicYear: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    teacherProfileId: z.string().optional(),
    scheduleDays: z.array(z.enum(CLASS_WEEKDAY_VALUES)).default([]),
    scheduleStartTime: z.string().optional(),
    scheduleEndTime: z.string().optional(),
    defaultMeetingPlatform: z
      .enum(["zoom", "google_meet", "teams", "in_person"])
      .default("in_person"),
    defaultMeetingLink: z
      .string()
      .url("Enter a valid meeting link")
      .optional()
      .or(z.literal("")),
    lateThresholdMinutes: z.coerce
      .number()
      .int()
      .min(0, "Late threshold must be 0 minutes or more")
      .max(120, "Late threshold must be 120 minutes or less")
      .default(5),
    studentProfileIds: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (
      data.startDate &&
      data.endDate &&
      new Date(data.endDate).getTime() < new Date(data.startDate).getTime()
    ) {
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

    if (
      data.defaultMeetingPlatform !== "in_person" &&
      !data.defaultMeetingLink
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meeting link is required for online classes",
        path: ["defaultMeetingLink"],
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

interface StudentOption {
  id: string
  studentId: string
  gradeLevel: string
  user: {
    firstName: string
    lastName: string
    email: string
    avatarUrl?: string | null
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
  studentOptions: StudentOption[]
}

export function ClassForm({
  initialData,
  isEditing = false,
  courses,
  teacherOptions,
  studentOptions,
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
      academicYear: initialData?.academicYear || "",
      startDate: formatDateForInput(initialData?.startDate) || "",
      endDate: formatDateForInput(initialData?.endDate) || "",
      teacherProfileId: initialData?.teacherProfileId || "",
      scheduleDays: initialData?.scheduleDays || [],
      scheduleStartTime: initialData?.scheduleStartTime || "",
      scheduleEndTime: initialData?.scheduleEndTime || "",
      defaultMeetingPlatform: initialData?.defaultMeetingPlatform || "in_person",
      defaultMeetingLink: initialData?.defaultMeetingLink || "",
      lateThresholdMinutes: initialData?.lateThresholdMinutes ?? 5,
      studentProfileIds: initialData?.studentProfileIds || [],
    },
  })

  const teacherComboboxOptions = teacherOptions.map((teacher) => ({
    value: teacher.id,
    label: `${teacher.user.firstName} ${teacher.user.lastName}${
      teacher.user.isActive ? "" : " [Inactive]"
    }`,
  }))
  const activeTeacherCount = teacherOptions.filter(
    (teacher) => teacher.user.isActive
  ).length
  const selectedCourseId = form.watch("courseId")
  const selectedMeetingPlatform = form.watch("defaultMeetingPlatform")
  const selectedStudentIds = form.watch("studentProfileIds")
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  )
  const eligibleStudentOptions = useMemo(() => {
    if (!selectedCourse) {
      return []
    }

    return studentOptions.filter(
      (student) =>
        !selectedCourse.gradeLevel ||
        student.gradeLevel === selectedCourse.gradeLevel
    )
  }, [selectedCourse, studentOptions])

  useEffect(() => {
    if (!selectedCourse) {
      if ((selectedStudentIds || []).length > 0) {
        form.setValue("studentProfileIds", [], { shouldValidate: true })
      }
      return
    }

    const eligibleIds = new Set(eligibleStudentOptions.map((student) => student.id))
    const filteredIds = (selectedStudentIds || []).filter((studentId) =>
      eligibleIds.has(studentId)
    )

    if (filteredIds.length !== (selectedStudentIds || []).length) {
      form.setValue("studentProfileIds", filteredIds, { shouldValidate: true })
    }
  }, [eligibleStudentOptions, form, selectedCourse, selectedStudentIds])

  const toggleStudentSelection = (studentProfileId: string) => {
    const currentIds = new Set(form.getValues("studentProfileIds"))

    if (currentIds.has(studentProfileId)) {
      currentIds.delete(studentProfileId)
    } else {
      currentIds.add(studentProfileId)
    }

    form.setValue("studentProfileIds", Array.from(currentIds), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  const toggleAllEligibleStudents = () => {
    const eligibleIds = eligibleStudentOptions.map((student) => student.id)
    const allSelected =
      eligibleIds.length > 0 &&
      eligibleIds.every((studentId) => selectedStudentIds.includes(studentId))

    form.setValue(
      "studentProfileIds",
      allSelected ? [] : eligibleIds,
      {
        shouldValidate: true,
        shouldDirty: true,
      }
    )
  }

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
        defaultMeetingLink: values.defaultMeetingLink || undefined,
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
                          {course.code} - {course.name}
                          {course.gradeLevel ? ` (${course.gradeLevel})` : ""}
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
                  <FormLabel>Academic Year</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="2026-2027"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional. Leave blank if you do not want to set an academic year.
                  </FormDescription>
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
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional. Used for date-bounded class scheduling and reporting.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional. Leave blank if this class has no defined end date yet.
                    </FormDescription>
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
              should see for this class. Scheduled sessions are generated
              automatically from this setup.
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

        <Card>
          <CardHeader>
            <CardTitle>Online Class & Attendance Rules</CardTitle>
            <CardDescription>
              Set the default join details and late rule that auto-generated
              sessions and join tracking should follow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="defaultMeetingPlatform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Meeting Platform</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the class platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {meetingPlatforms.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          {platform.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Sessions can still override this, but this class-level setup
                    is the main default.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMeetingPlatform !== "in_person" ? (
              <FormField
                control={form.control}
                name="defaultMeetingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Meeting Link</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://zoom.us/j/1234567890"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Teachers and students will see this class join link when a
                      session uses the class default.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="lateThresholdMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Late Threshold (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      step={1}
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Example: set 5 so student joins after 5 minutes are marked
                    late, with exact late minutes recorded.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student Assignment</CardTitle>
            <CardDescription>
              {isEditing
                ? "Manage the active student roster for this class. Unchecked active students will be removed from the class."
                : "Select students to enroll when this class is created."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="studentProfileIds"
              render={() => (
                <FormItem>
                  <FormLabel>Assigned Students</FormLabel>
                  <FormDescription>
                    {selectedCourse
                      ? selectedCourse.gradeLevel
                        ? `Only students in ${selectedCourse.gradeLevel} are shown for ${selectedCourse.code}.`
                        : `All active students are shown because ${selectedCourse.code} has no grade level set.`
                      : "Select a course first to load eligible students."}
                  </FormDescription>
                  <FormControl>
                    <div className="space-y-3">
                      {selectedCourse ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={toggleAllEligibleStudents}
                            disabled={isLoading || eligibleStudentOptions.length === 0}
                          >
                            {eligibleStudentOptions.length > 0 &&
                            eligibleStudentOptions.every((student) =>
                              selectedStudentIds.includes(student.id)
                            )
                              ? "Clear All"
                              : "Select All Eligible"}
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {selectedStudentIds.length} student
                            {selectedStudentIds.length === 1 ? "" : "s"} selected
                          </span>
                        </div>
                      ) : null}

                      {!selectedCourse ? (
                        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                          Choose a course first to assign students by grade level.
                        </div>
                      ) : eligibleStudentOptions.length === 0 ? (
                        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                          {selectedCourse.gradeLevel
                            ? `No active students are available in ${selectedCourse.gradeLevel}.`
                            : "No active students are available for this course."}
                        </div>
                      ) : (
                        <ScrollArea className="h-72 rounded-md border">
                          <div className="space-y-1 p-2">
                            {eligibleStudentOptions.map((student) => {
                              const checked = selectedStudentIds.includes(student.id)

                              return (
                                <label
                                  key={student.id}
                                  className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                      toggleStudentSelection(student.id)
                                    }
                                    disabled={isLoading}
                                  />
                                  <UserAvatar
                                    firstName={student.user.firstName}
                                    lastName={student.user.lastName}
                                    avatarUrl={student.user.avatarUrl}
                                    className="h-10 w-10"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium">
                                      {student.user.firstName} {student.user.lastName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {student.studentId} - {student.user.email}
                                    </p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
