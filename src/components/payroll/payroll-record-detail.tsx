"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { PayrollStatus } from "@prisma/client"
import {
  BadgeCheck,
  Download,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  Save,
} from "lucide-react"
import { PayrollRecordDetailItem, PayrollRecordListItem } from "@/lib/payroll/payroll-data"
import { AcademyPayrollSettingsData } from "@/lib/payroll/payroll-adjustments"
import { payrollRoleLabels, payrollStatusLabels } from "@/lib/payroll/payroll-utils"
import { PayrollAdjustmentsManager } from "@/components/payroll/payroll-adjustments-manager"
import { PayrollBreakdownCard } from "@/components/payroll/payroll-breakdown-card"
import { PayrollRecordsTable } from "@/components/payroll/payroll-records-table"
import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CurrencyAmount } from "@/components/ui/currency-amount"
import { DocumentActionButton } from "@/components/ui/document-action-button"
import {
  Form,
  FormControl,
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

const formSchema = z.object({
  grossAmount: z.coerce.number().positive("Gross amount must be greater than zero"),
  status: z.nativeEnum(PayrollStatus),
  paidAmount: z.coerce.number().min(0).optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PayrollRecordDetailProps {
  record: PayrollRecordDetailItem
  history: PayrollRecordListItem[]
  mode?: "admin" | "teacher"
  settings?: AcademyPayrollSettingsData | null
}

function getDefaultValues(record: PayrollRecordDetailItem): FormValues {
  return {
    grossAmount: record.grossAmount,
    status: record.status,
    paidAmount:
      record.status === PayrollStatus.pending ? 0 : Number(record.paidAmount || 0),
    paymentDate: record.paymentDate?.split("T")[0] || "",
    notes: record.notes || "",
  }
}

function RuleValue({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

export function PayrollRecordDetail({
  record,
  history,
  mode = "admin",
  settings = null,
}: PayrollRecordDetailProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(record),
  })

  const selectedStatus = form.watch("status")
  const isAdminView = mode === "admin"

  async function onSubmit(values: FormValues) {
    if (!isAdminView) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const response = await fetch(`/api/admin/payroll/${record.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update payroll record")
      }

      setSubmitSuccess("Payroll record updated successfully.")
      router.refresh()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update payroll record"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleFinalize() {
    setIsFinalizing(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const response = await fetch(`/api/admin/payroll/${record.id}/finalize`, {
        method: "POST",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to finalize payroll record")
      }

      setSubmitSuccess("Payroll finalized and salary slip prepared successfully.")
      router.refresh()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to finalize payroll record"
      )
    } finally {
      setIsFinalizing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Payroll Record</CardTitle>
              <CardDescription>
                {record.periodLabel} for {record.user.firstName} {record.user.lastName}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <PayrollStatusBadge status={record.status} />
              {record.isFinalized ? (
                <Button type="button" variant="outline" disabled>
                  <LockKeyhole className="mr-2 h-4 w-4" />
                  Finalized
                </Button>
              ) : null}
              {record.isFinalized ? (
                <DocumentActionButton
                  downloadUrl={`/api/payroll/${record.id}/slip`}
                  variant="outline"
                  icon={<Download className="h-4 w-4" />}
                  label="Download Salary Slip"
                />
              ) : isAdminView ? (
                <Button type="button" onClick={handleFinalize} disabled={isFinalizing}>
                  {isFinalizing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BadgeCheck className="mr-2 h-4 w-4" />
                  )}
                  Finalize Payroll
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Employee</p>
              <p className="font-medium">
                {record.user.firstName} {record.user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{record.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium">{payrollRoleLabels[record.role]}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Salary Profile</p>
              <p className="font-medium">
                <CurrencyAmount
                  amount={record.compensationProfile.amount}
                  currency={record.compensationProfile.currency}
                />
              </p>
              <p className="text-sm text-muted-foreground">
                Effective{" "}
                {new Date(record.compensationProfile.effectiveFrom).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Date</p>
              <p className="font-medium">
                {record.paymentDate
                  ? new Date(record.paymentDate).toLocaleDateString()
                  : "Not recorded"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created By</p>
              <p className="font-medium">
                {record.createdBy.firstName} {record.createdBy.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Updated</p>
              <p className="font-medium">
                {new Date(record.updatedAt).toLocaleDateString()}
              </p>
              {record.updatedBy ? (
                <p className="text-sm text-muted-foreground">
                  by {record.updatedBy.firstName} {record.updatedBy.lastName}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gross Amount</p>
              <p className="font-medium">
                <CurrencyAmount amount={record.grossAmount} currency={record.currency} />
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Payable</p>
              <p className="font-medium">
                <CurrencyAmount
                  amount={record.breakdown.netPayable}
                  currency={record.currency}
                />
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm">
                {record.notes || "No notes for this payroll record."}
              </p>
            </div>
          </CardContent>
        </Card>

        <PayrollBreakdownCard
          breakdown={record.breakdown}
          paidAmount={record.paidAmount}
          outstandingAmount={record.outstandingAmount}
          currency={record.currency}
        />
      </div>

      {settings ? (
        <Card>
          <CardHeader>
            <CardTitle>Automatic Deduction Rules</CardTitle>
            <CardDescription>
              These academy payroll rules determine how late joins and absences are converted into deductions before finalization.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <RuleValue
              label="Late Join Auto Apply"
              value={settings.autoApplyLateDeductions ? "Enabled" : "Disabled"}
            />
            <RuleValue
              label="Late Grace"
              value={`${settings.lateGraceMinutes} minute${settings.lateGraceMinutes === 1 ? "" : "s"}`}
            />
            <RuleValue
              label="Late Mode"
              value={settings.lateDeductionMode.replaceAll("_", " ")}
            />
            <RuleValue
              label="Late Value"
              value={String(settings.lateDeductionValue)}
            />
            <RuleValue
              label="Absence Auto Apply"
              value={settings.autoApplyAbsenceDeductions ? "Enabled" : "Disabled"}
            />
            <RuleValue
              label="Absence Value"
              value={`${settings.absenceDeductionMode.replaceAll("_", " ")} - ${settings.absenceDeductionValue}`}
            />
          </CardContent>
        </Card>
      ) : null}

      <PayrollAdjustmentsManager
        recordId={record.id}
        adjustments={record.adjustments}
        currency={record.currency}
        canManage={isAdminView}
      />

      {isAdminView ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Update Payroll Status</CardTitle>
              <CardDescription>
                Adjust the recorded salary amount, payment status, and payroll notes.
              </CardDescription>
            </div>
            {record.isFinalized ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleFinalize}
                disabled={isFinalizing}
              >
                {isFinalizing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Refresh Salary Slip
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                              <SelectValue placeholder="Select payroll status" />
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

                  <FormField
                    control={form.control}
                    name="paidAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={isSubmitting || selectedStatus === PayrollStatus.pending}
                            {...field}
                          />
                        </FormControl>
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
                          <Input
                            type="date"
                            disabled={isSubmitting || selectedStatus === PayrollStatus.pending}
                            {...field}
                          />
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
                          placeholder="Optional payroll notes..."
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
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
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Salary Slip Access</CardTitle>
            <CardDescription>
              Finalized payroll records include a downloadable salary slip with your bonus and deduction breakdown.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {record.isFinalized ? (
              <DocumentActionButton
                downloadUrl={`/api/payroll/${record.id}/slip`}
                variant="outline"
                icon={<Download className="h-4 w-4" />}
                label="Download Salary Slip"
              />
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                This payroll record is still in draft. Your salary slip will become available after the academy finalizes payroll for this period.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
          <CardDescription>
            Recent payroll records for this employee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayrollRecordsTable
            records={history}
            showEmployee={false}
            showActions
            detailBasePath={isAdminView ? "/admin/payroll" : "/teacher/payroll"}
          />
        </CardContent>
      </Card>
    </div>
  )
}
