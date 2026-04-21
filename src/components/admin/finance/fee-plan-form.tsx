"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Switch } from "@/components/ui/switch"
import { SUPPORTED_CURRENCIES } from "@/lib/currency-utils"

const frequencies = [
  { value: "one_time", label: "One Time" },
  { value: "monthly", label: "Monthly" },
  { value: "term", label: "Term (3 months)" },
  { value: "yearly", label: "Yearly" },
]

const lateFeeTypes = [
  { value: "fixed", label: "Fixed Amount" },
  { value: "percentage", label: "Percentage" },
]

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null
  }

  return value
}, z.coerce.number().optional().nullable())

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.string().min(1, "Currency is required"),
  frequency: z.enum(["one_time", "monthly", "term", "yearly"]),
  dueDayOfMonth: optionalNumber.refine(
    (value) => value === null || value === undefined || (value >= 1 && value <= 31),
    "Due day must be between 1 and 31"
  ),
  lateFeeAmount: optionalNumber.refine(
    (value) => value === null || value === undefined || value >= 0,
    "Late fee amount must be 0 or more"
  ),
  lateFeeType: z.enum(["fixed", "percentage"]).optional().nullable(),
  isActive: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface FeePlanFormProps {
  initialData?: Partial<FormValues> & { id?: string }
  isEditing?: boolean
}

export function FeePlanForm({
  initialData,
  isEditing = false,
}: FeePlanFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      amount: initialData?.amount || 0,
      currency: initialData?.currency || "USD",
      frequency: initialData?.frequency || "monthly",
      dueDayOfMonth: initialData?.dueDayOfMonth || null,
      lateFeeAmount: initialData?.lateFeeAmount || null,
      lateFeeType: initialData?.lateFeeType || null,
      isActive: initialData?.isActive ?? true,
    },
  })

  const frequency = form.watch("frequency")
  const lateFeeType = form.watch("lateFeeType")
  const amount = form.watch("amount")

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const url =
        isEditing && initialData?.id
          ? `/api/admin/finance/fee-plans/${initialData.id}`
          : "/api/admin/finance/fee-plans"

      const method = isEditing ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save fee plan")
      }

      router.push("/admin/finance/fee-plans")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fee Plan Details</CardTitle>
            <CardDescription>
              Configure the fee structure and billing rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Monthly Tuition Fee"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this fee plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description of this fee..."
                      disabled={isLoading}
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Frequency *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {frequencies.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {frequency === "monthly" && (
              <FormField
                control={form.control}
                name="dueDayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Day of Month</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="1"
                        disabled={isLoading}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Day of the month when payment is due (1-31)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Late Fee Settings</CardTitle>
            <CardDescription>
              Configure penalties for overdue payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lateFeeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Late Fee Type</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? null : value)
                      }
                      value={field.value || "none"}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {lateFeeTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {lateFeeType && (
                <FormField
                  control={form.control}
                  name="lateFeeAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {lateFeeType === "fixed" ? "Amount" : "Percentage (%)"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={lateFeeType === "fixed" ? "0.00" : "0"}
                          disabled={isLoading}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      {lateFeeType === "percentage" && amount > 0 && field.value && (
                        <FormDescription>
                          Calculated amount: {form.watch("currency")}{" "}
                          {((amount * (field.value || 0)) / 100).toFixed(2)}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Inactive fee plans cannot be assigned to classes
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
            {isEditing ? "Save Changes" : "Create Fee Plan"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
