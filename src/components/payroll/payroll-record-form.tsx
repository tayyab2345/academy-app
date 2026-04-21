"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { PayrollStatus } from "@prisma/client"
import { Loader2, PlusCircle } from "lucide-react"
import { PayrollStaffOption } from "@/lib/payroll/payroll-data"
import {
  getPayrollMonthValue,
  payrollRoleLabels,
  payrollStatusLabels,
} from "@/lib/payroll/payroll-utils"
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
import { Textarea } from "@/components/ui/textarea"

const today = new Date()

const formSchema = z.object({
  userId: z.string().min(1, "Select an employee"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Choose a valid payroll month"),
  grossAmount: z.coerce.number().positive("Gross amount must be greater than zero"),
  currency: z.string().min(3, "Currency is required").max(8),
  status: z.nativeEnum(PayrollStatus),
  paidAmount: z.coerce.number().min(0).optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PayrollRecordFormProps {
  staffOptions: PayrollStaffOption[]
  initialUserId?: string
}

function getDefaultValues(option: PayrollStaffOption | undefined): FormValues {
  return {
    userId: option?.id || "",
    month: getPayrollMonthValue(today.getFullYear(), today.getMonth() + 1),
    grossAmount: option?.compensationProfile?.amount || 0,
    currency: option?.compensationProfile?.currency || "USD",
    status: PayrollStatus.pending,
    paidAmount: 0,
    paymentDate: "",
    notes: "",
  }
}

export function PayrollRecordForm({
  staffOptions,
  initialUserId,
}: PayrollRecordFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const initialOption =
    staffOptions.find((option) => option.id === initialUserId) || staffOptions[0]

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(initialOption),
  })

  const selectedUserId = form.watch("userId")
  const selectedStatus = form.watch("status")

  const selectedOption = useMemo(
    () => staffOptions.find((option) => option.id === selectedUserId),
    [selectedUserId, staffOptions]
  )

  const hasActiveCompensationProfile = Boolean(
    selectedOption?.compensationProfile?.isActive
  )

  useEffect(() => {
    if (!selectedOption) {
      return
    }

    form.setValue(
      "grossAmount",
      selectedOption.compensationProfile?.amount || 0,
      { shouldDirty: false }
    )
    form.setValue(
      "currency",
      selectedOption.compensationProfile?.currency || "USD",
      { shouldDirty: false }
    )
  }, [form, selectedOption])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch("/api/admin/payroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create payroll record")
      }

      if (data?.record?.id) {
        router.push(`/admin/payroll/${data.record.id}`)
        return
      }

      router.refresh()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create payroll record"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (staffOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Payroll Record</CardTitle>
          <CardDescription>
            No active teachers or admin staff are available for payroll yet.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Payroll Record</CardTitle>
        <CardDescription>
          Generate a payroll entry for a monthly salary period. Bonuses and deductions can be reviewed after the record is created.
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
                  <FormLabel>Employee</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
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
                            ? ` · ${selectedOption.employeeId}`
                            : ""
                        }`
                      : "Select the employee you want to pay."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Period</FormLabel>
                    <FormControl>
                      <Input type="month" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grossAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gross Amount</FormLabel>
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
                      <Input disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value as PayrollStatus)
                      }
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(PayrollStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {payrollStatusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedStatus === PayrollStatus.partial ? (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="paidAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the amount already paid for this period.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormDescription>
                        Optional if the partial payment date is known.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {selectedStatus === PayrollStatus.paid ? (
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave blank to record the payment as paid today.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes about this payroll entry..."
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!hasActiveCompensationProfile && selectedOption ? (
              <div className="rounded-md bg-yellow-100 p-3 text-sm text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300">
                This employee needs an active salary profile before payroll can be created.
              </div>
            ) : null}

            {submitError ? (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || !hasActiveCompensationProfile}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                Create Payroll Record
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
