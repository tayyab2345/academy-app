"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"

const formSchema = z.object({
  teacherProfileId: z.string().min(1, "Teacher is required"),
  role: z.enum(["primary", "assistant"]).default("primary"),
})

type FormValues = z.infer<typeof formSchema>

interface Teacher {
  id: string
  employeeId: string | null
  user: {
    firstName: string
    lastName: string
    email: string
    isActive: boolean
  }
}

interface AssignTeacherDialogProps {
  classId: string
  existingTeacherIds: string[]
  teacherOptions: Teacher[]
  onAssigned?: () => void
}

export function AssignTeacherDialog({
  classId,
  existingTeacherIds,
  teacherOptions,
  onAssigned,
}: AssignTeacherDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teacherProfileId: "",
      role: "primary",
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset({
        teacherProfileId: "",
        role: "primary",
      })
    }
  }, [form, open])

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/classes/${classId}/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to assign teacher")
      }

      router.refresh()
      setOpen(false)
      form.reset()
      onAssigned?.()
    } catch (error) {
      console.error("Failed to assign teacher:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const availableTeachers = useMemo(
    () =>
      teacherOptions.filter(
        (teacher) =>
          teacher.user.isActive && !existingTeacherIds.includes(teacher.id)
      ),
    [existingTeacherIds, teacherOptions]
  )

  const teacherComboboxOptions = availableTeachers.map((teacher) => ({
    value: teacher.id,
    label: `${teacher.user.firstName} ${teacher.user.lastName}${
      teacher.employeeId ? ` (${teacher.employeeId})` : ""
    } - ${teacher.user.email}`,
  }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Assign Teacher
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Teacher</DialogTitle>
          <DialogDescription>
            Assign a teacher to this class
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="teacherProfileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher</FormLabel>
                  <FormControl>
                    <Combobox
                      options={teacherComboboxOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={
                        availableTeachers.length > 0
                          ? "Select a teacher"
                          : "No active teachers available"
                      }
                      emptyText="No active teachers available for assignment."
                      disabled={isLoading || availableTeachers.length === 0}
                    />
                  </FormControl>
                  {availableTeachers.length === 0 ? (
                    <FormDescription>
                      No active teachers available for assignment.
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="primary">Primary Teacher</SelectItem>
                      <SelectItem value="assistant">Assistant Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Primary teacher has full control over the class
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || availableTeachers.length === 0}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Teacher
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
