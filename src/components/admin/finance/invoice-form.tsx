"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Save, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
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
import { Combobox } from "@/components/ui/combobox"
import { SUPPORTED_CURRENCIES } from "@/lib/currency-utils"

const invoiceCategories = [
  { value: "tuition", label: "Tuition Fee" },
  { value: "registration", label: "Registration Fee" },
  { value: "material", label: "Material Fee" },
  { value: "transport", label: "Transport Fee" },
  { value: "activity", label: "Activity Fee" },
  { value: "other", label: "Other" },
] as const

const formSchema = z.object({
  studentProfileId: z.string().min(1, "Student is required"),
  classId: z.string().optional().nullable(),
  feePlanId: z.string().optional().nullable(),
  invoiceCategory: z.enum([
    "tuition",
    "registration",
    "material",
    "transport",
    "activity",
    "other",
  ]),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  taxAmount: z.coerce.number().min(0).default(0),
  currency: z.string().min(1, "Currency is required"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Student {
  id: string
  studentId: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
}

interface InvoiceFormProps {
  initialData?: Partial<FormValues> & { id?: string }
  isEditing?: boolean
}

export function InvoiceForm({
  initialData,
  isEditing = false,
}: InvoiceFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentProfileId: initialData?.studentProfileId || "",
      classId: initialData?.classId || null,
      feePlanId: initialData?.feePlanId || null,
      invoiceCategory: initialData?.invoiceCategory || "tuition",
      description: initialData?.description || "",
      amount: initialData?.amount || 0,
      taxAmount: initialData?.taxAmount || 0,
      currency: initialData?.currency || "USD",
      dueDate:
        initialData?.dueDate ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      notes: initialData?.notes || "",
    },
  })

  const amount = Number(form.watch("amount") || 0)
  const taxAmount = Number(form.watch("taxAmount") || 0)
  const currency = form.watch("currency")
  const total = amount + taxAmount

  useEffect(() => {
    if (!isEditing) {
      void fetchStudents()
    }
  }, [studentSearch, isEditing])

  const fetchStudents = async () => {
    setIsLoadingStudents(true)

    try {
      const params = new URLSearchParams()
      if (studentSearch) {
        params.set("search", studentSearch)
      }
      params.set("limit", "50")

      const response = await fetch(`/api/admin/students?${params.toString()}`)
      const data = await response.json()
      setStudents(data.students || [])
    } catch (fetchError) {
      console.error("Failed to fetch students:", fetchError)
    } finally {
      setIsLoadingStudents(false)
    }
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const url =
        isEditing && initialData?.id
          ? `/api/admin/finance/invoices/${initialData.id}`
          : "/api/admin/finance/invoices"

      const method = isEditing ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save invoice")
      }

      router.push(
        isEditing && initialData?.id
          ? `/admin/finance/invoices/${initialData.id}`
          : "/admin/finance/invoices"
      )
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "An error occurred"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const studentOptions = students.map((student) => ({
    value: student.id,
    label: `${student.user.firstName} ${student.user.lastName} (${student.studentId})`,
  }))

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Create a new invoice for a student</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditing && (
              <FormField
                control={form.control}
                name="studentProfileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student *</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search students..."
                            value={studentSearch}
                            onChange={(event) =>
                              setStudentSearch(event.target.value)
                            }
                            className="pl-9"
                          />
                        </div>
                        <Combobox
                          options={studentOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={
                            isLoadingStudents ? "Loading..." : "Select a student"
                          }
                          emptyText="No students found"
                          disabled={isLoading || isLoadingStudents}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="invoiceCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {invoiceCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Monthly tuition fee - October 2024"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
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
                name="taxAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
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
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((supportedCurrency) => (
                          <SelectItem
                            key={supportedCurrency.code}
                            value={supportedCurrency.code}
                          >
                            {supportedCurrency.symbol} {supportedCurrency.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {total > 0 && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold">
                  {currency} {total.toFixed(2)}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date *</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} />
                  </FormControl>
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
                      placeholder="Additional notes..."
                      disabled={isLoading}
                      className="min-h-[80px]"
                      {...field}
                    />
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
            {isEditing ? "Save Changes" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
