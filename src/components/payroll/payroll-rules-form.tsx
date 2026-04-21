"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { PayrollRuleMode } from "@prisma/client"
import { Loader2, Save } from "lucide-react"
import { AcademyPayrollSettingsData } from "@/lib/payroll/payroll-adjustments"
import { payrollRuleModeLabels } from "@/lib/payroll/payroll-utils"
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

const formSchema = z.object({
  autoApplyLateDeductions: z.boolean(),
  lateGraceMinutes: z.coerce.number().int().min(0).max(240),
  lateDeductionMode: z.nativeEnum(PayrollRuleMode),
  lateDeductionValue: z.coerce.number().min(0),
  autoApplyAbsenceDeductions: z.boolean(),
  absenceDeductionMode: z.nativeEnum(PayrollRuleMode),
  absenceDeductionValue: z.coerce.number().min(0),
})

type FormValues = z.infer<typeof formSchema>

interface PayrollRulesFormProps {
  settings: AcademyPayrollSettingsData
}

export function PayrollRulesForm({ settings }: PayrollRulesFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      autoApplyLateDeductions: settings.autoApplyLateDeductions,
      lateGraceMinutes: settings.lateGraceMinutes,
      lateDeductionMode: settings.lateDeductionMode,
      lateDeductionValue: settings.lateDeductionValue,
      autoApplyAbsenceDeductions: settings.autoApplyAbsenceDeductions,
      absenceDeductionMode: settings.absenceDeductionMode,
      absenceDeductionValue: settings.absenceDeductionValue,
    },
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const response = await fetch("/api/admin/payroll/settings/rules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save payroll rules")
      }

      setSubmitSuccess("Payroll deduction rules saved successfully.")
      router.refresh()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save payroll rules"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automatic Payroll Rules</CardTitle>
        <CardDescription>
          Configure late-join and absence deductions that can be recalculated before payroll is finalized.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 rounded-lg border p-4">
              <FormField
                control={form.control}
                name="autoApplyLateDeductions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <FormLabel>Late Join Deductions</FormLabel>
                      <FormDescription>
                        Automatically add deductions when a teacher joins after the allowed grace period.
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

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="lateGraceMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grace Minutes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="240"
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
                  name="lateDeductionMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deduction Mode</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as PayrollRuleMode)
                        }
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(PayrollRuleMode).map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {payrollRuleModeLabels[mode]}
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
                  name="lateDeductionValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("lateDeductionMode") === PayrollRuleMode.percentage
                          ? "Deduction Percentage"
                          : "Deduction Amount"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <FormField
                control={form.control}
                name="autoApplyAbsenceDeductions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <FormLabel>Absence Deductions</FormLabel>
                      <FormDescription>
                        Automatically add deductions when a scheduled class session has no teacher join recorded.
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

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="absenceDeductionMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deduction Mode</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as PayrollRuleMode)
                        }
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(PayrollRuleMode).map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {payrollRuleModeLabels[mode]}
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
                  name="absenceDeductionValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("absenceDeductionMode") === PayrollRuleMode.percentage
                          ? "Deduction Percentage"
                          : "Deduction Amount"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
                Save Payroll Rules
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
