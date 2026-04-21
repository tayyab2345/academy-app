"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, UserPlus, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserAvatar } from "@/components/ui/user-avatar"

const formSchema = z.object({
  studentIds: z.array(z.string()).min(1, "Select at least one student"),
})

type FormValues = z.infer<typeof formSchema>

interface Student {
  id: string
  studentId: string
  gradeLevel: string
  user: {
    firstName: string
    lastName: string
    email: string
    avatarUrl?: string | null
  }
}

interface EnrollStudentsDialogProps {
  classId: string
  courseGradeLevel: string
  existingStudentIds: string[]
  onEnrolled?: () => void
}

export function EnrollStudentsDialog({
  classId,
  courseGradeLevel,
  existingStudentIds,
  onEnrolled,
}: EnrollStudentsDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentIds: [],
    },
  })

  useEffect(() => {
    if (open) {
      fetchStudents()
    }
  }, [open, searchQuery])

  useEffect(() => {
    if (open) {
      setSelectedStudents(new Set())
      form.reset({ studentIds: [] })
    }
  }, [open, form])

  const fetchStudents = async () => {
    setIsLoadingStudents(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      params.set("gradeLevel", courseGradeLevel)
      params.set("limit", "100")

      const response = await fetch(`/api/admin/students?${params.toString()}`)
      const data = await response.json()
      const available = (data.students || []).filter(
        (student: Student) => !existingStudentIds.includes(student.id)
      )
      setStudents(available)
    } catch (error) {
      console.error("Failed to fetch students:", error)
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const toggleStudent = (studentId: string) => {
    const nextSelected = new Set(selectedStudents)
    if (nextSelected.has(studentId)) {
      nextSelected.delete(studentId)
    } else {
      nextSelected.add(studentId)
    }

    setSelectedStudents(nextSelected)
    form.setValue("studentIds", Array.from(nextSelected), { shouldValidate: true })
  }

  const toggleAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
      form.setValue("studentIds", [], { shouldValidate: true })
    } else {
      const allIds = new Set(students.map((student) => student.id))
      setSelectedStudents(allIds)
      form.setValue("studentIds", Array.from(allIds), { shouldValidate: true })
    }
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/classes/${classId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to enroll students")
      }

      router.refresh()
      setOpen(false)
      form.reset()
      onEnrolled?.()
    } catch (error) {
      console.error("Failed to enroll students:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Enroll Students
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enroll Students</DialogTitle>
          <DialogDescription>
            Enroll students into this class. Only students in {courseGradeLevel} are shown.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studentIds"
              render={() => (
                <FormItem>
                  <FormLabel>Select Students</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={toggleAll}
                          disabled={students.length === 0}
                        >
                          {selectedStudents.size === students.length ? "Deselect All" : "Select All"}
                        </Button>
                      </div>

                      {selectedStudents.size > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""} selected
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStudents(new Set())
                              form.setValue("studentIds", [], { shouldValidate: true })
                            }}
                          >
                            <X className="mr-1 h-3 w-3" />
                            Clear
                          </Button>
                        </div>
                      )}

                      {isLoadingStudents ? (
                        <div className="py-4 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </div>
                      ) : students.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <p>No available students found in {courseGradeLevel}</p>
                          <p className="mt-1 text-sm">
                            {searchQuery ? "Try a different search" : "All students in this grade may already be enrolled"}
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-80 rounded-md border">
                          <div className="space-y-1 p-2">
                            {students.map((student) => (
                              <div
                                key={student.id}
                                className={`
                                  flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors
                                  ${selectedStudents.has(student.id)
                                    ? "border border-primary/20 bg-primary/10"
                                    : "hover:bg-muted"
                                  }
                                `}
                                onClick={() => toggleStudent(student.id)}
                              >
                                <Checkbox
                                  checked={selectedStudents.has(student.id)}
                                  onCheckedChange={() => toggleStudent(student.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <UserAvatar
                                  firstName={student.user.firstName}
                                  lastName={student.user.lastName}
                                  avatarUrl={student.user.avatarUrl}
                                  className="h-10 w-10"
                                />
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {student.user.firstName} {student.user.lastName}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{student.studentId}</span>
                                    <span>•</span>
                                    <span>{student.gradeLevel}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </FormControl>
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
              <Button type="submit" disabled={isLoading || selectedStudents.size === 0}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enroll {selectedStudents.size > 0 ? `(${selectedStudents.size})` : ""}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
