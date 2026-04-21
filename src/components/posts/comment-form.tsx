"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment is too long"),
})

type FormValues = z.infer<typeof formSchema>

interface CommentFormProps {
  postId: string
  parentCommentId?: string | null
  initialContent?: string
  onCancel?: () => void
  onSuccess?: () => void
  isEditing?: boolean
  commentId?: string
}

export function CommentForm({
  postId,
  parentCommentId = null,
  initialContent = "",
  onCancel,
  onSuccess,
  isEditing = false,
  commentId,
}: CommentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: initialContent,
    },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const url =
        isEditing && commentId
          ? `/api/comments/${commentId}`
          : `/api/posts/${postId}/comments`
      const method = isEditing ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: values.content,
          ...(parentCommentId && { parentCommentId }),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Failed to save comment")
      }

      form.reset({ content: "" })
      onSuccess?.()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save comment"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder={
                    parentCommentId ? "Write a reply..." : "Write a comment..."
                  }
                  disabled={isLoading}
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isEditing ? "Save" : parentCommentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
