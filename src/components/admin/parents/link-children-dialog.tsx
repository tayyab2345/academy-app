"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Link2, Search } from "lucide-react"

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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserAvatar } from "@/components/ui/user-avatar"

const formSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  relationshipType: z.enum(["father", "mother", "guardian", "grandparent", "other"]),
  canPickup: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  isPrimaryForStudent: z.boolean().default(false),
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

interface LinkChildrenDialogProps {
  parentId: string
  existingStudentIds: string[]
  onLinked?: () => void
}

export function LinkChildrenDialog({
  parentId,
  existingStudentIds,
  onLinked,
}: LinkChildrenDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      relationshipType: "guardian",
      canPickup: false,
      isEmergencyContact: false,
      isPrimaryForStudent: false,
    },
  })

  useEffect(() => {
    if (open) {
      fetchStudents()
    }
  }, [open, searchQuery])

  const fetchStudents = async () => {
    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/admin/students?search=${encodeURIComponent(searchQuery)}&limit=50`
      )
      const data = await response.json()
      const available = data.students.filter(
        (student: Student) => !existingStudentIds.includes(student.id)
      )
      setStudents(available)
    } catch (error) {
      console.error("Failed to fetch students:", error)
    } finally {
      setIsSearching(false)
    }
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/parents/${parentId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to link student")
      }

      router.refresh()
      setOpen(false)
      form.reset()
      onLinked?.()
    } catch (error) {
      console.error("Failed to link student:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedStudent = students.find(
    (student) => student.id === form.watch("studentId")
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Link2 className="mr-2 h-4 w-4" />
          Link Child
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Student</DialogTitle>
          <DialogDescription>
            Link a student to this parent and define the relationship
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Student</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search students..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      {isSearching ? (
                        <div className="py-4 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </div>
                      ) : students.length === 0 ? (
                        <div className="py-4 text-center text-muted-foreground">
                          No available students found
                        </div>
                      ) : (
                        <ScrollArea className="h-64 rounded-md border">
                          <div className="space-y-1 p-2">
                            {students.map((student) => (
                              <div
                                key={student.id}
                                className={
                                  field.value === student.id
                                    ? "cursor-pointer rounded-lg border-primary bg-primary/10 p-3 transition-colors"
                                    : "cursor-pointer rounded-lg p-3 transition-colors hover:bg-muted"
                                }
                                onClick={() => field.onChange(student.id)}
                              >
                                <div className="flex items-center gap-3">
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
                                      <span>-</span>
                                      <span>{student.gradeLevel}</span>
                                    </div>
                                  </div>
                                  {field.value === student.id && (
                                    <Badge variant="success">Selected</Badge>
                                  )}
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

            {selectedStudent && (
              <>
                <FormField
                  control={form.control}
                  name="relationshipType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="guardian">Guardian</SelectItem>
                          <SelectItem value="grandparent">Grandparent</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="isEmergencyContact"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Emergency Contact</FormLabel>
                          <FormDescription>
                            This parent should be contacted in emergencies
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="canPickup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Can Pick Up</FormLabel>
                          <FormDescription>
                            Authorized to pick up the student from school
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPrimaryForStudent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Primary Parent for This Student</FormLabel>
                          <FormDescription>
                            Designate as the primary contact for this specific student
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !selectedStudent}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link Student
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
