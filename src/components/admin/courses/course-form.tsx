"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { ImageUploadField } from "@/components/profile/image-upload-field"
import { DocumentUploadField } from "@/components/uploads/document-upload-field"

const formSchema = z.object({
  code: z.string().min(2, "Course code must be at least 2 characters"),
  name: z.string().min(2, "Course name must be at least 2 characters"),
  description: z.string().optional(),
  syllabusPdfUrl: z.string().nullable().optional(),
  syllabusImageUrl: z.string().nullable().optional(),
  gradeLevel: z.string().optional(),
  subjectArea: z.string().min(2, "Subject area must be at least 2 characters"),
  isActive: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface CourseFormProps {
  initialData?: Partial<FormValues> & { id?: string }
  isEditing?: boolean
}

export function CourseForm({ initialData, isEditing = false }: CourseFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: initialData?.code || "",
      name: initialData?.name || "",
      description: initialData?.description || "",
      syllabusPdfUrl: initialData?.syllabusPdfUrl || null,
      syllabusImageUrl: initialData?.syllabusImageUrl || null,
      gradeLevel: initialData?.gradeLevel || "",
      subjectArea: initialData?.subjectArea || "",
      isActive: initialData?.isActive ?? true,
    },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const url = isEditing && initialData?.id
        ? `/api/admin/courses/${initialData.id}`
        : "/api/admin/courses"

      const method = isEditing ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save course")
      }

      router.push("/admin/courses")
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
            <CardTitle>Course Information</CardTitle>
            <CardDescription>
              Define the course catalog entry used to create classes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="MATH-101" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription>
                      Unique within this academy
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gradeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Level</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Grade 5, Hifz Batch, Beginner, etc."
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional. You can type any custom grade or level label.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Algebra I"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectArea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Area *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Mathematics"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Broad subject grouping used for catalog organization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief overview of the course curriculum..."
                      disabled={isLoading}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                )}
            />

            <FormField
              control={form.control}
              name="syllabusPdfUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Syllabus PDF</FormLabel>
                  <FormControl>
                    <DocumentUploadField
                      value={field.value}
                      onChange={field.onChange}
                      uploadTarget="course_syllabus_pdf"
                      uploadEndpoint="/api/uploads/course-media"
                      title="Course syllabus PDF"
                      description="Upload the syllabus or teaching outline document for this course."
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="syllabusImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Syllabus Image</FormLabel>
                  <FormControl>
                    <ImageUploadField
                      value={field.value}
                      onChange={field.onChange}
                      uploadTarget="course_syllabus_image"
                      uploadEndpoint="/api/uploads/course-media"
                      shape="square"
                      title="Course outline image"
                      description="Upload a visual course outline, poster, or summary image."
                      previewName={form.watch("name")}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                  <div className="space-y-1">
                    <FormLabel>Active Course</FormLabel>
                    <FormDescription>
                      Active courses can be used when creating new classes
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
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
            {isEditing ? "Save Changes" : "Create Course"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
