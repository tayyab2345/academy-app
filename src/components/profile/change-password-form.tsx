"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"
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

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "Confirm password must match the new password",
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current password",
  })

type ChangePasswordValues = z.infer<typeof changePasswordSchema>
type PasswordFieldName = keyof ChangePasswordValues

const passwordFieldLabels: Record<PasswordFieldName, string> = {
  currentPassword: "Current Password",
  newPassword: "New Password",
  confirmNewPassword: "Confirm New Password",
}

export function ChangePasswordForm() {
  const [isSaving, setIsSaving] = useState(false)
  const [visibleFields, setVisibleFields] = useState<
    Record<PasswordFieldName, boolean>
  >({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  })

  const toggleVisibility = (fieldName: PasswordFieldName) => {
    setVisibleFields((current) => ({
      ...current,
      [fieldName]: !current[fieldName],
    }))
  }

  async function onSubmit(values: ChangePasswordValues) {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to change password")
      }

      form.reset()
      setVisibleFields({
        currentPassword: false,
        newPassword: false,
        confirmNewPassword: false,
      })
      setSuccess("Password changed successfully.")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to change password"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-600" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your own account password securely through Supabase Auth.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  "currentPassword",
                  "newPassword",
                  "confirmNewPassword",
                ] satisfies PasswordFieldName[]
              ).map((fieldName) => (
                <FormField
                  key={fieldName}
                  control={form.control}
                  name={fieldName}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{passwordFieldLabels[fieldName]}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={visibleFields[fieldName] ? "text" : "password"}
                            autoComplete={
                              fieldName === "currentPassword"
                                ? "current-password"
                                : "new-password"
                            }
                            disabled={isSaving}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            aria-label={
                              visibleFields[fieldName]
                                ? `Hide ${passwordFieldLabels[fieldName]}`
                                : `Show ${passwordFieldLabels[fieldName]}`
                            }
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition hover:text-foreground"
                            disabled={isSaving}
                            onClick={() => toggleVisibility(fieldName)}
                          >
                            {visibleFields[fieldName] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <FormDescription className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Your current password is verified first. The new password is saved
              only in Supabase Auth, never in profile tables.
            </FormDescription>

            {error ? (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                {success}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Change Password
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
