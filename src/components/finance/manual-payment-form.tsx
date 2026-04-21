"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { AlertCircle, Loader2, Send } from "lucide-react"
import { z } from "zod"
import { manualSubmissionPaymentMethodLabels, manualSubmissionPaymentMethods } from "@/lib/manual-payment-utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CurrencyAmount } from "@/components/ui/currency-amount"
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
import { ReceiptUploadField } from "@/components/finance/receipt-upload-field"

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentMethod: z.enum(manualSubmissionPaymentMethods),
  transactionId: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
  note: z.string().optional(),
  receiptUrl: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) =>
        !value ||
        /^https?:\/\//i.test(value) ||
        value.startsWith("/api/uploads/receipts/") ||
        value.startsWith("/api/documents/"),
      "Receipt URL must be a valid upload or document URL"
    ),
})

type FormValues = z.infer<typeof formSchema>

interface ManualPaymentFormProps {
  invoiceId: string
  invoiceNumber: string
  currency: string
  outstandingAmount: number
  userRole: "parent" | "student"
  pendingSubmission?: {
    id: string
  } | null
  latestSubmission?: {
    id: string
    status: "pending" | "approved" | "rejected"
    rejectionReason?: string | null
  } | null
}

export function ManualPaymentForm({
  invoiceId,
  invoiceNumber,
  currency,
  outstandingAmount,
  userRole,
  pendingSubmission,
  latestSubmission,
}: ManualPaymentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: Number(outstandingAmount.toFixed(2)),
      paymentMethod: "bank_transfer",
      transactionId: "",
      paymentDate: new Date().toISOString().split("T")[0],
      note: "",
      receiptUrl: "",
    },
  })

  async function onSubmit(values: FormValues) {
    if (values.amount > outstandingAmount) {
      form.setError("amount", {
        message: "Amount cannot exceed the outstanding balance",
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const endpoint =
        userRole === "parent"
          ? `/api/parent/finance/invoices/${invoiceId}/submit-payment`
          : `/api/student/finance/invoices/${invoiceId}/submit-payment`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          receiptUrl: uploadedUrl || values.receiptUrl || undefined,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit payment proof")
      }

      router.refresh()
      form.reset()
      setUploadedUrl(null)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit payment proof"
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (pendingSubmission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="h-5 w-5" />
            Payment Submission Pending
          </CardTitle>
          <CardDescription>
            A payment proof for invoice {invoiceNumber} is already pending admin
            review. You&apos;ll be notified when it has been approved or rejected.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Payment Proof</CardTitle>
        <CardDescription>
          After making the payment, submit the details below so the academy can
          verify it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-lg bg-muted p-3">
          <p className="text-sm font-medium">Outstanding Balance</p>
          <p className="text-2xl font-bold">
            <CurrencyAmount amount={outstandingAmount} currency={currency} />
          </p>
        </div>

        {latestSubmission?.status === "rejected" && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Your previous submission was rejected.
            {latestSubmission.rejectionReason
              ? ` Reason: ${latestSubmission.rejectionReason}`
              : ""}
          </div>
        )}

        {latestSubmission?.status === "approved" && outstandingAmount > 0 && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Your last submission was approved. You can submit another payment
            proof if you still need to clear the remaining balance.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={outstandingAmount}
                      placeholder="0.00"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the exact amount you paid.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {manualSubmissionPaymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {manualSubmissionPaymentMethodLabels[method]}
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
              name="transactionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction ID / Reference</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. TRX-123456"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add the transfer or wallet reference if one is available.
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
                    <Input type="date" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt / Screenshot</FormLabel>
                  <FormControl>
                    <ReceiptUploadField
                      value={field.value || undefined}
                      onChange={(url) => {
                        field.onChange(url || "")
                        setUploadedUrl(url || null)
                      }}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload the payment receipt or screenshot if you have one.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any extra context for the finance team..."
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Payment Proof
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
