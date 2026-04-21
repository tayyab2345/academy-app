"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyAmount } from "@/components/ui/currency-amount"

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "online", label: "Online Payment" },
  { value: "manual", label: "Manual Entry" },
] as const

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "online", "manual"]),
  transactionReference: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface RecordPaymentDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  invoiceId: string
  invoiceNumber: string
  currency: string
  outstandingAmount: number
  onPaymentRecorded?: () => void
  triggerLabel?: string
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  currency,
  outstandingAmount,
  onPaymentRecorded,
  triggerLabel,
}: RecordPaymentDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = open !== undefined && onOpenChange !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = isControlled ? onOpenChange : setInternalOpen

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: outstandingAmount,
      paymentMethod: "cash",
      transactionReference: "",
      paymentDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  })

  useEffect(() => {
    if (dialogOpen) {
      form.reset({
        amount: outstandingAmount,
        paymentMethod: "cash",
        transactionReference: "",
        paymentDate: new Date().toISOString().split("T")[0],
        notes: "",
      })
    }
  }, [dialogOpen, outstandingAmount, form])

  async function onSubmit(values: FormValues) {
    if (values.amount > outstandingAmount) {
      form.setError("amount", {
        message: `Amount cannot exceed outstanding balance of ${currency} ${outstandingAmount.toFixed(2)}`,
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/admin/finance/invoices/${invoiceId}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to record payment")
      }

      router.refresh()
      setDialogOpen(false)
      form.reset()
      onPaymentRecorded?.()
    } catch (error) {
      console.error("Failed to record payment:", error)
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to record payment",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {triggerLabel && (
        <Button onClick={() => setDialogOpen(true)}>
          <DollarSign className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Outstanding Balance</span>
              <span className="text-lg font-bold">
                <CurrencyAmount amount={outstandingAmount} currency={currency} />
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={outstandingAmount}
                          placeholder="0.00"
                          className="pl-9"
                          disabled={isLoading}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Maximum:{" "}
                      <CurrencyAmount
                        amount={outstandingAmount}
                        currency={currency}
                      />
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
                    <FormLabel>Payment Method *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
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
                name="transactionReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Reference</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Receipt #, Transaction ID"
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
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date *</FormLabel>
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
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <div className="text-sm font-medium text-destructive">
                  {form.formState.errors.root.message}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Payment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
