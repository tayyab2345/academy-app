"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Separator } from "@/components/ui/separator"
import { ImageUploadField } from "@/components/profile/image-upload-field"
import { DeleteAcademyDialog } from "@/components/admin/delete-academy-dialog"

const academySettingsSchema = z.object({
  name: z.string().min(2, "Academy name must be at least 2 characters"),
  logoUrl: z.string().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  contactEmail: z.string().email("Please enter a valid email address"),
})

type AcademySettingsValues = z.infer<typeof academySettingsSchema>

const presetColors = [
  { name: "Green", value: "#059669" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Teal", value: "#0d9488" },
]

interface AcademySettingsFormProps {
  academy: {
    name: string
    logoUrl: string | null
    primaryColor: string
    contactEmail: string
  }
  deleteSummary: {
    teachers: number
    students: number
    parents: number
    classes: number
  }
  recoveryWindowDays: number
}

export function AcademySettingsForm({
  academy,
  deleteSummary,
  recoveryWindowDays,
}: AcademySettingsFormProps) {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<AcademySettingsValues>({
    resolver: zodResolver(academySettingsSchema),
    defaultValues: {
      name: academy.name,
      logoUrl: academy.logoUrl,
      primaryColor: academy.primaryColor,
      contactEmail: academy.contactEmail,
    },
  })

  const watchPrimaryColor = form.watch("primaryColor")

  async function onSubmit(values: AcademySettingsValues) {
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update settings")
      }

      await update({
        ...session,
        user: {
          ...session?.user,
          academy: {
            ...session?.user.academy,
            name: data.academy.name,
            logoUrl: data.academy.logoUrl,
            primaryColor: data.academy.primaryColor,
            contactEmail: data.academy.contactEmail,
          },
        },
      })

      setSuccess(true)
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to update settings"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Academy Settings</h2>
        <p className="text-muted-foreground">
          Manage your academy branding and shared profile information
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Update the academy identity shown throughout the admin, teacher,
            student, and parent portals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academy Logo</FormLabel>
                    <FormControl>
                      <ImageUploadField
                        value={field.value}
                        onChange={field.onChange}
                        uploadTarget="academy_logo"
                        shape="square"
                        title="Academy logo"
                        description="Upload the logo used in shared portal branding and branded documents."
                        previewName={form.watch("name")}
                        previewColor={form.watch("primaryColor")}
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academy Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Greenwood International School"
                        disabled={isSaving}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This name is used across the portals, PDFs, and academy branding.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Color</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Input
                            type="color"
                            className="h-10 w-20 cursor-pointer p-1"
                            disabled={isSaving}
                            {...field}
                          />
                          <Input placeholder="#059669" disabled={isSaving} {...field} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {presetColors.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              className="h-8 w-8 rounded-full border-2 transition-all hover:scale-110"
                              style={{
                                backgroundColor: color.value,
                                borderColor:
                                  field.value === color.value
                                    ? color.value
                                    : "transparent",
                                outline:
                                  field.value === color.value
                                    ? `2px solid ${color.value}40`
                                    : "none",
                              }}
                              onClick={() => field.onChange(color.value)}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Choose the accent color used in portal branding.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">Color Preview</p>
                <div className="flex flex-wrap gap-3">
                  <div
                    className="rounded-md px-4 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: watchPrimaryColor }}
                  >
                    Primary Button
                  </div>
                  <div
                    className="rounded-md border px-4 py-2 text-sm font-medium"
                    style={{
                      borderColor: watchPrimaryColor,
                      color: watchPrimaryColor,
                      backgroundColor: `${watchPrimaryColor}10`,
                    }}
                  >
                    Secondary Button
                  </div>
                  <div
                    className="rounded-md px-4 py-2 text-sm"
                    style={{
                      backgroundColor: `${watchPrimaryColor}15`,
                      color: watchPrimaryColor,
                    }}
                  >
                    Badge
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@academy.com"
                        disabled={isSaving}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Public email address used in academy-branded communication.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  Settings saved successfully!
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
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

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Deactivating your academy immediately blocks dashboard access for all
            users. Data stays recoverable for {recoveryWindowDays} days before any
            separate cleanup decision should be made.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Use this only when you intentionally want to deactivate the academy.
            </p>
            <p>
              This action is reversible during the recovery window and does not
              hard delete students, teachers, classes, finance, payroll, reports,
              results, or documents.
            </p>
          </div>
          <DeleteAcademyDialog
            academyName={academy.name}
            summary={deleteSummary}
            recoveryWindowDays={recoveryWindowDays}
          />
        </CardContent>
      </Card>
    </div>
  )
}
