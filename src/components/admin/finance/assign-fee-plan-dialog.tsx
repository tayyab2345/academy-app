"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { CurrencyAmount } from "@/components/ui/currency-amount"

const formSchema = z.object({
  feePlanId: z.string().min(1, "Fee plan is required"),
  customAmount: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null
    }

    return value
  }, z.coerce.number().positive().optional().nullable()),
  effectiveFrom: z.string().min(1, "Effective date is required"),
  effectiveUntil: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface FeePlan {
  id: string
  name: string
  amount: number | string
  currency: string
  frequency: string
}

interface AssignFeePlanDialogProps {
  classId: string
  className: string
  existingFeePlanIds: string[]
  onAssigned?: () => void
}

export function AssignFeePlanDialog({
  classId,
  className,
  existingFeePlanIds,
  onAssigned,
}: AssignFeePlanDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [feePlans, setFeePlans] = useState<FeePlan[]>([])
  const [isLoadingFeePlans, setIsLoadingFeePlans] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      feePlanId: "",
      customAmount: null,
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveUntil: null,
    },
  })

  const selectedFeePlanId = form.watch("feePlanId")
  const selectedFeePlan = feePlans.find((plan) => plan.id === selectedFeePlanId)

  useEffect(() => {
    if (open) {
      fetchFeePlans()
    }
  }, [open])

  const fetchFeePlans = async () => {
    setIsLoadingFeePlans(true)
    try {
      const response = await fetch("/api/admin/finance/fee-plans?limit=100&isActive=true")
      const data = await response.json()
      const available = data.feePlans.filter(
        (plan: FeePlan) => !existingFeePlanIds.includes(plan.id)
      )
      setFeePlans(available)
    } catch (error) {
      console.error("Failed to fetch fee plans:", error)
    } finally {
      setIsLoadingFeePlans(false)
    }
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/finance/classes/${classId}/fee-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to assign fee plan")
      }

      router.refresh()
      setOpen(false)
      form.reset()
      onAssigned?.()
    } catch (error) {
      console.error("Failed to assign fee plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Assign Fee Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Fee Plan</DialogTitle>
          <DialogDescription>Assign a fee plan to {className}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="feePlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Plan</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading || isLoadingFeePlans}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a fee plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {feePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          <div className="flex w-full items-center justify-between">
                            <span>{plan.name}</span>
                            <span className="ml-4 text-muted-foreground">
                              <CurrencyAmount amount={plan.amount} currency={plan.currency} />
                              {" / "}
                              {plan.frequency}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {feePlans.length === 0 && !isLoadingFeePlans && (
                    <FormDescription>
                      No available fee plans.{" "}
                      <a
                        href="/admin/finance/fee-plans/new"
                        className="text-primary hover:underline"
                      >
                        Create one
                      </a>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedFeePlan && (
              <FormField
                control={form.control}
                name="customAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Amount (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={selectedFeePlan.amount.toString()}
                        disabled={isLoading}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Override the default amount of{" "}
                      <CurrencyAmount
                        amount={selectedFeePlan.amount}
                        currency={selectedFeePlan.currency}
                      />
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="effectiveFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective From</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effectiveUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Until (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={isLoading}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank for indefinite assignment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !selectedFeePlanId}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Fee Plan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
