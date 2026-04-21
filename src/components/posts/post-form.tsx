"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, MessageSquare, Pin, PinOff, Save } from "lucide-react"
import { AnnouncementAudienceSelector } from "./announcement-audience-selector"
import { PostImageUploadField } from "./post-image-upload-field"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const ACADEMY_WIDE_VALUE = "__academy__"

const formSchema = z.object({
  classId: z.string().optional().nullable(),
  title: z.string().min(2, "Title must be at least 2 characters"),
  content: z.string().min(1, "Content is required"),
  imageUrl: z.string().nullable().optional(),
  isPinned: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  visibility: z.enum(["class_only", "parents_only", "students_only", "everyone"]),
})

type FormValues = z.infer<typeof formSchema>

interface ClassItem {
  id: string
  name: string
  course: {
    code: string
    name: string
  }
}

interface PostFormProps {
  initialData?: Partial<FormValues> & { id?: string }
  isEditing?: boolean
  redirectPath: string
  classOptions: ClassItem[]
}

export function PostForm({
  initialData,
  isEditing = false,
  redirectPath,
  classOptions,
}: PostFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classId: initialData?.classId || null,
      title: initialData?.title || "",
      content: initialData?.content || "",
      imageUrl: initialData?.imageUrl || null,
      isPinned: initialData?.isPinned || false,
      allowComments: initialData?.allowComments ?? true,
      visibility: initialData?.visibility || "class_only",
    },
  })

  const selectedClassId = form.watch("classId")

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const url =
        isEditing && initialData?.id
          ? `/api/posts/${initialData.id}`
          : "/api/posts"
      const method = isEditing ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save announcement")
      }

      router.push(redirectPath)
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "An error occurred"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-3xl space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing ? "Edit Announcement" : "Create Announcement"}
            </CardTitle>
            <CardDescription>
              Share important updates with your academy community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select
                    value={field.value || ACADEMY_WIDE_VALUE}
                    onValueChange={(value) =>
                      field.onChange(
                        value === ACADEMY_WIDE_VALUE ? null : value
                      )
                    }
                    disabled={isLoading || isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ACADEMY_WIDE_VALUE}>
                        Academy-wide announcement
                      </SelectItem>
                      {classOptions.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.course.code}: {classItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Leave this on academy-wide if the announcement should not be limited to one class.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Announcement title..."
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
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your announcement here..."
                      disabled={isLoading}
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Announcement Image</FormLabel>
                  <FormControl>
                    <PostImageUploadField
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Add one image to make the announcement more visual across all feeds.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <AnnouncementAudienceSelector
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isLoading}
                    showClassOnly={Boolean(selectedClassId)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border-t pt-4">
              <FormField
                control={form.control}
                name="isPinned"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2 text-base">
                        {field.value ? (
                          <Pin className="h-4 w-4" />
                        ) : (
                          <PinOff className="h-4 w-4" />
                        )}
                        Pin this announcement
                      </FormLabel>
                      <FormDescription>
                        Pinned announcements stay at the top of the feed.
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

              <FormField
                control={form.control}
                name="allowComments"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2 text-base">
                        <MessageSquare className="h-4 w-4" />
                        Allow comments
                      </FormLabel>
                      <FormDescription>
                        Let readers reply to this announcement.
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
            {isEditing ? "Save Changes" : "Publish Announcement"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
