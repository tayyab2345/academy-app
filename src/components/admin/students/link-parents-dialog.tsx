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
  parentId: z.string().min(1, "Please select a parent"),
  relationshipType: z.enum(["father", "mother", "guardian", "grandparent", "other"]),
  canPickup: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  isPrimaryForStudent: z.boolean().default(false),
})

interface Parent {
  id: string
  user: {
    firstName: string
    lastName: string
    email: string
    phone: string | null
    avatarUrl?: string | null
  }
}

interface LinkParentDialogProps {
  studentId: string
  existingParentIds: string[]
  onLinked?: () => void
}

export function LinkParentDialog({
  studentId,
  existingParentIds,
  onLinked,
}: LinkParentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [parents, setParents] = useState<Parent[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parentId: "",
      relationshipType: "guardian",
      canPickup: false,
      isEmergencyContact: false,
      isPrimaryForStudent: false,
    },
  })

  useEffect(() => {
    if (open) {
      fetchParents()
    }
  }, [open, searchQuery])

  const fetchParents = async () => {
    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/admin/parents?search=${encodeURIComponent(searchQuery)}&limit=50`
      )
      const data = await response.json()
      const available = data.parents.filter(
        (parent: Parent) => !existingParentIds.includes(parent.id)
      )
      setParents(available)
    } catch (error) {
      console.error("Failed to fetch parents:", error)
    } finally {
      setIsSearching(false)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/parents/${values.parentId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          relationshipType: values.relationshipType,
          canPickup: values.canPickup,
          isEmergencyContact: values.isEmergencyContact,
          isPrimaryForStudent: values.isPrimaryForStudent,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to link parent")
      }

      router.refresh()
      setOpen(false)
      form.reset()
      onLinked?.()
    } catch (error) {
      console.error("Failed to link parent:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedParent = parents.find(
    (parent) => parent.id === form.watch("parentId")
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="mr-2 h-4 w-4" />
          Link Parent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Parent</DialogTitle>
          <DialogDescription>
            Link a parent/guardian to this student
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Parent</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search parents..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      {isSearching ? (
                        <div className="py-4 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </div>
                      ) : parents.length === 0 ? (
                        <div className="py-4 text-center text-muted-foreground">
                          No available parents found
                        </div>
                      ) : (
                        <ScrollArea className="h-64 rounded-md border">
                          <div className="space-y-1 p-2">
                            {parents.map((parent) => (
                              <div
                                key={parent.id}
                                className={
                                  field.value === parent.id
                                    ? "cursor-pointer rounded-lg border-primary bg-primary/10 p-3 transition-colors"
                                    : "cursor-pointer rounded-lg p-3 transition-colors hover:bg-muted"
                                }
                                onClick={() => field.onChange(parent.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <UserAvatar
                                    firstName={parent.user.firstName}
                                    lastName={parent.user.lastName}
                                    avatarUrl={parent.user.avatarUrl}
                                    className="h-10 w-10"
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium">
                                      {parent.user.firstName} {parent.user.lastName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {parent.user.email}
                                    </p>
                                  </div>
                                  {field.value === parent.id && (
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

            {selectedParent && (
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
              <Button type="submit" disabled={isLoading || !selectedParent}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link Parent
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
