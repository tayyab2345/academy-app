"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Save, Loader2, Landmark, Smartphone, FileText } from "lucide-react"
import { z } from "zod"
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
import { Textarea } from "@/components/ui/textarea"

const paymentSettingsSchema = z.object({
  jazzCashNumber: z.string().optional(),
  easyPaisaNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountTitle: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  iban: z.string().optional(),
  paymentInstructions: z.string().optional(),
})

type FormValues = z.infer<typeof paymentSettingsSchema>

interface PaymentSettingsFormProps {
  initialSettings: {
    jazzCashNumber: string | null
    easyPaisaNumber: string | null
    bankName: string | null
    bankAccountTitle: string | null
    bankAccountNumber: string | null
    iban: string | null
    paymentInstructions: string | null
  }
}

export function PaymentSettingsForm({
  initialSettings,
}: PaymentSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      jazzCashNumber: initialSettings.jazzCashNumber || "",
      easyPaisaNumber: initialSettings.easyPaisaNumber || "",
      bankName: initialSettings.bankName || "",
      bankAccountTitle: initialSettings.bankAccountTitle || "",
      bankAccountNumber: initialSettings.bankAccountNumber || "",
      iban: initialSettings.iban || "",
      paymentInstructions: initialSettings.paymentInstructions || "",
    },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save payment settings")
      }

      form.reset({
        jazzCashNumber: data.settings.jazzCashNumber || "",
        easyPaisaNumber: data.settings.easyPaisaNumber || "",
        bankName: data.settings.bankName || "",
        bankAccountTitle: data.settings.bankAccountTitle || "",
        bankAccountNumber: data.settings.bankAccountNumber || "",
        iban: data.settings.iban || "",
        paymentInstructions: data.settings.paymentInstructions || "",
      })
      setSuccess(true)
      router.refresh()

      window.setTimeout(() => setSuccess(false), 3000)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save payment settings"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile Wallets
            </CardTitle>
            <CardDescription>
              Add the wallet numbers parents and students should use for manual
              payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="jazzCashNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>JazzCash Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0300-1234567"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be shown on invoice payment instructions.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="easyPaisaNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Easypaisa Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0312-7654321"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional second mobile wallet option for manual payments.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Bank Transfer Details
            </CardTitle>
            <CardDescription>
              Add bank details for transfer-based manual payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Meezan Bank" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankAccountTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="AcademyFlow School"
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
              name="bankAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0123456789012345"
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
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PK36SCBL0000001123456702"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include the full IBAN if you want it shown to families.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Instructions
            </CardTitle>
            <CardDescription>
              Add any payment notes, deadlines, or proof submission guidance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="paymentInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder="Example: Please include the invoice number in your transfer reference and upload the payment screenshot after payment."
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                Payment settings saved successfully.
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Payment Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}
