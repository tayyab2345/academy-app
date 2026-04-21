"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Save } from "lucide-react"
import { PayrollStaffOption } from "@/lib/payroll/payroll-data"
import { payrollRoleLabels } from "@/lib/payroll/payroll-utils"
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

const formSchema = z.object({
  userId: z.string().min(1, "Select a staff member"),
  amount: z.coerce.number().positive("Salary amount must be greater than zero"),
  currency: z.string().min(3, "Currency is required").max(8),
  effectiveFrom: z.string().min(1, "Effective date is required"),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface SalaryProfileFormProps {
  staffOptions: PayrollStaffOption[]
  initialUserId?: string
}

function getDefaultValues(option: PayrollStaffOption | undefined): FormValues {
  const today = new Date().toISOString().split("T")[0]

  return {
    userId: option?.id || "",
    amount: option?.compensationProfile?.amount || 0,
    currency: option?.compensationProfile?.currency || "USD",
    effectiveFrom:
      option?.compensationProfile?.effectiveFrom?.split("T")[0] || today,
    notes: option?.compensationProfile?.notes || "",
    isActive: option?.compensationProfile?.isActive ?? true,
  }
}

export function SalaryProfileForm({
  staffOptions,
  initialUserId,
}: SalaryProfileFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const initialOption =
    staffOptions.find((option) => option.id === initialUserId) || staffOptions[0]

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(initialOption),
  })

  const selectedUserId = form.watch("userId")
  const selectedOption = useMemo(
    () => staffOptions.find((option) => option.id === selectedUserId),
    [selectedUserId, staffOptions]
  )

  useEffect(() => {
    form.reset(getDefaultValues(selectedOption))
  }, [form, selectedOption])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const response = await fetch("/api/admin/payroll/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save salary profile")
      }

      setSubmitSuccess("Salary profile saved successfully.")
      router.refresh()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save salary profile"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (staffOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Salary Settings</CardTitle>
          <CardDescription>
            No active teachers or admin staff are available right now.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Salary Profile</CardTitle>
        <CardDescription>
          Configure the monthly salary amount used when creating payroll records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a staff member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.firstName} {option.lastName} · {payrollRoleLabels[option.role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedOption
                      ? `${selectedOption.email}${
                          selectedOption.employeeId
                            ? ` · Employee ID: ${selectedOption.employeeId}`
                            : ""
                        }`
                      : "Choose a staff member to manage salary details."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Salary</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
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
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="USD" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective From</FormLabel>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes about salary terms..."
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
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Profile Active</FormLabel>
                    <FormDescription>
                      Inactive profiles stay in history but are not used for new payroll records.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {submitError ? (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </div>
            ) : null}

            {submitSuccess ? (
              <div className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">
                {submitSuccess}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Salary Profile
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
