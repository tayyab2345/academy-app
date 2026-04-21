"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ExamType } from "@prisma/client"
import { Loader2, Save } from "lucide-react"
import { ResultClassOption } from "@/lib/results/result-data"
import { examTypeLabels } from "@/lib/results/result-utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: z.string().min(2, "Exam name must be at least 2 characters"),
  type: z.nativeEnum(ExamType),
  examDate: z.string().min(1, "Exam date is required"),
  totalMarks: z.coerce.number().positive("Total marks must be greater than zero"),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ExamFormProps {
  classOptions: ResultClassOption[]
  initialData?: Partial<FormValues> & {
    id?: string
  }
  isEditing?: boolean
  backHref: string
  successHref: string
}

export function ExamForm({
  classOptions,
  initialData,
  isEditing = false,
  backHref,
  successHref,
}: ExamFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classId: initialData?.classId || classOptions[0]?.id || "",
      name: initialData?.name || "",
      type: initialData?.type || ExamType.monthly,
      examDate: initialData?.examDate || new Date().toISOString().slice(0, 10),
      totalMarks: initialData?.totalMarks || 100,
      notes: initialData?.notes || "",
    },
  })

  const selectedClassId = form.watch("classId")
  const selectedClass = useMemo(
    () => classOptions.find((option) => option.id === selectedClassId) || null,
    [classOptions, selectedClassId]
  )

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(
        isEditing && initialData?.id
          ? `/api/results/${initialData.id}`
          : "/api/results",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save exam")
      }

      if (!isEditing && data?.exam?.id) {
        router.push(successHref.replace(":id", data.exam.id))
        return
      }

      router.push(successHref)
      router.refresh()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save exam"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (classOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Exam" : "Create Exam"}</CardTitle>
          <CardDescription>
            No classes are currently available for results management.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Exam" : "Create Exam"}</CardTitle>
            <CardDescription>
              Create a class-based test or exam and then enter student marks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting || isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classOptions.map((classOption) => (
                          <SelectItem key={classOption.id} value={classOption.id}>
                            {classOption.course.code}: {classOption.name}
                            {classOption.section
                              ? ` (Section ${classOption.section})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {selectedClass
                        ? `Subject / Course: ${selectedClass.course.name}`
                        : "Choose the class for this exam."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as ExamType)}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exam type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(ExamType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {examTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Monthly Test - April"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="examDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="totalMarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Marks</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This value is used to calculate percentages and grades automatically.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional instructions or notes for this exam..."
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {submitError ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {submitError}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(backHref)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditing ? "Save Changes" : "Create Exam"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
