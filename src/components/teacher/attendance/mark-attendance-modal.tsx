"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Check, X, Clock, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/ui/user-avatar"

const formSchema = z.object({
  status: z.enum(["present", "absent", "late", "excused"]),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Student {
  id: string
  studentId: string
  user: {
    firstName: string
    lastName: string
    avatarUrl?: string | null
  }
}

interface MarkAttendanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  student: Student | null
  currentStatus?: string
  onMarked?: () => void
}

export function MarkAttendanceModal({
  open,
  onOpenChange,
  sessionId,
  student,
  currentStatus,
  onMarked,
}: MarkAttendanceModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: (currentStatus as FormValues["status"]) || "present",
      notes: "",
    },
  })

  async function onSubmit(values: FormValues) {
    if (!student) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        studentProfileId: student.id,
      })

      const response = await fetch(
        `/api/teacher/sessions/${sessionId}/attendance?${params.toString()}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to mark attendance")
      }

      router.refresh()
      onOpenChange(false)
      form.reset()
      onMarked?.()
    } catch (error) {
      console.error("Failed to mark attendance:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!student) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
          <DialogDescription>
            Update attendance status for this student
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <UserAvatar
            firstName={student.user.firstName}
            lastName={student.user.lastName}
            avatarUrl={student.user.avatarUrl}
            className="h-10 w-10"
          />
          <div>
            <p className="font-medium">
              {student.user.firstName} {student.user.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{student.studentId}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="present">
                        <span className="flex items-center">
                          <Check className="mr-2 h-4 w-4 text-green-600" />
                          Present
                        </span>
                      </SelectItem>
                      <SelectItem value="late">
                        <span className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                          Late
                        </span>
                      </SelectItem>
                      <SelectItem value="absent">
                        <span className="flex items-center">
                          <X className="mr-2 h-4 w-4 text-red-600" />
                          Absent
                        </span>
                      </SelectItem>
                      <SelectItem value="excused">
                        <span className="flex items-center">
                          <AlertCircle className="mr-2 h-4 w-4 text-blue-600" />
                          Excused
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this attendance..."
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Attendance
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
