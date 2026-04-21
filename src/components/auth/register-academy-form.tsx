"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const formSchema = z
  .object({
    academyName: z.string().min(2, "Academy name must be at least 2 characters"),
    subdomain: z
      .string()
      .min(3, "Subdomain must be at least 3 characters")
      .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
    contactEmail: z.string().email("Please enter a valid email address"),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    adminEmail: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof formSchema>

const steps = [
  { id: 1, title: "Academy Details", description: "Tell us about your academy" },
  { id: 2, title: "Admin Account", description: "Create your admin account" },
  { id: 3, title: "Review", description: "Confirm your information" },
]

function normalizeEmailValue(value: string) {
  return value.trim().toLowerCase()
}

export function RegisterAcademyForm() {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubdomainAvailable, setIsSubdomainAvailable] = React.useState<boolean | null>(null)
  const [isCheckingSubdomain, setIsCheckingSubdomain] = React.useState(false)
  const [subdomainCheckNotice, setSubdomainCheckNotice] = React.useState<string | null>(null)
  const subdomainCheckTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      academyName: "",
      subdomain: "",
      contactEmail: "",
      firstName: "",
      lastName: "",
      adminEmail: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  })

  const checkSubdomain = async (subdomain: string) => {
    if (subdomain.length < 3) {
      return
    }

    setIsCheckingSubdomain(true)
    setSubdomainCheckNotice(null)

    try {
      const response = await fetch(`/api/register/check-subdomain?subdomain=${subdomain}`)
      const data = await response.json()

      if (!response.ok) {
        setIsSubdomainAvailable(null)
        setSubdomainCheckNotice(
          data.warning ||
            "Subdomain check is temporarily unavailable. A fallback subdomain will be assigned during registration if needed."
        )
        return
      }

      setIsSubdomainAvailable(typeof data.available === "boolean" ? data.available : null)
      setSubdomainCheckNotice(
        data.warning ||
          (data.available === false
            ? "Requested subdomain is already in use. A fallback subdomain will be assigned during registration."
            : null)
      )
    } catch {
      setIsSubdomainAvailable(null)
      setSubdomainCheckNotice(
        "Subdomain check is temporarily unavailable. A fallback subdomain will be assigned during registration if needed."
      )
    } finally {
      setIsCheckingSubdomain(false)
    }
  }

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
    form.setValue("subdomain", value, { shouldValidate: true, shouldDirty: true })
    setSubdomainCheckNotice(null)

    if (subdomainCheckTimeoutRef.current) {
      clearTimeout(subdomainCheckTimeoutRef.current)
    }

    if (value.length >= 3) {
      subdomainCheckTimeoutRef.current = setTimeout(() => checkSubdomain(value), 500)
      return
    }

    setIsSubdomainAvailable(null)
  }

  React.useEffect(() => {
    return () => {
      if (subdomainCheckTimeoutRef.current) {
        clearTimeout(subdomainCheckTimeoutRef.current)
      }
    }
  }, [])

  async function onSubmit(values: FormValues) {
    if (step < 3) {
      setStep(step + 1)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // TEMP: disable email verification for local/dev so registration submits directly.
      const response = await fetch("/api/register/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academyName: values.academyName,
          subdomain: values.subdomain,
          contactEmail: values.contactEmail,
          firstName: values.firstName,
          lastName: values.lastName,
          email: normalizeEmailValue(values.adminEmail),
          password: values.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      const nextUrl = new URL("/login", window.location.origin)
      nextUrl.searchParams.set("registered", "true")

      if (typeof data.academy?.subdomain === "string") {
        nextUrl.searchParams.set("subdomain", data.academy.subdomain)
      }

      if (typeof data.warning === "string" && data.warning.length > 0) {
        nextUrl.searchParams.set("notice", data.warning)
      }

      router.push(`${nextUrl.pathname}${nextUrl.search}`)
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Registration failed"

      setError(message)
      setStep(message.toLowerCase().includes("email") ? 2 : 3)
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = async () => {
    let fieldsToValidate: (keyof FormValues)[] = []

    if (step === 1) {
      fieldsToValidate = ["academyName", "subdomain", "contactEmail"]
    } else if (step === 2) {
      fieldsToValidate = [
        "firstName",
        "lastName",
        "adminEmail",
        "password",
        "confirmPassword",
      ]
    }

    const isValid = await form.trigger(fieldsToValidate)

    if (!isValid) {
      return
    }

    if (step === 3) {
      form.handleSubmit(onSubmit)()
      return
    }

    setError(null)
    setStep(step + 1)
  }

  const prevStep = () => {
    setStep(step - 1)
    setError(null)
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <div className="mb-4 flex items-center justify-between">
          {steps.map((currentStep, index) => (
            <React.Fragment key={currentStep.id}>
              <div className="flex items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    step === currentStep.id
                      ? "bg-primary text-primary-foreground"
                      : step > currentStep.id
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > currentStep.id ? <Check className="h-4 w-4" /> : currentStep.id}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className="text-sm font-medium">{currentStep.title}</p>
                  <p className="text-xs text-muted-foreground">{currentStep.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && <div className="mx-4 h-px flex-1 bg-border" />}
            </React.Fragment>
          ))}
        </div>
        <CardTitle className="text-2xl">{steps[step - 1].title}</CardTitle>
        <CardDescription>{steps[step - 1].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4">
            {step === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="academyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academy Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Greenwood International School"
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
                  name="subdomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subdomain</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Input
                            placeholder="greenwood"
                            disabled={isLoading}
                            onChange={handleSubdomainChange}
                            value={field.value}
                          />
                          <span className="ml-2 text-muted-foreground">.academyflow.com</span>
                        </div>
                      </FormControl>
                      {isCheckingSubdomain && (
                        <FormDescription>Checking availability...</FormDescription>
                      )}
                      {subdomainCheckNotice && (
                        <FormDescription className="text-amber-600">
                          {subdomainCheckNotice}
                        </FormDescription>
                      )}
                      {isSubdomainAvailable === true && !subdomainCheckNotice && (
                        <FormDescription className="text-green-600">
                          Subdomain is available
                        </FormDescription>
                      )}
                      {isSubdomainAvailable === false && !subdomainCheckNotice && (
                        <FormDescription className="text-amber-600">
                          Requested subdomain is already in use. A fallback subdomain will be
                          assigned during registration.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@greenwood.edu"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Public email for academy inquiries</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" disabled={isLoading} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" disabled={isLoading} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@greenwood.edu"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>This will be your login email</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="********"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>At least 8 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="********"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && <div className="text-sm font-medium text-destructive">{error}</div>}
              </>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-semibold">Academy Information</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Academy Name:</dt>
                      <dd className="text-right font-medium">{form.getValues("academyName")}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Requested Subdomain:</dt>
                      <dd className="text-right font-medium">
                        {form.getValues("subdomain")}.academyflow.com
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Contact Email:</dt>
                      <dd className="text-right font-medium">{form.getValues("contactEmail")}</dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-semibold">Admin Account</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Name:</dt>
                      <dd className="text-right font-medium">
                        {form.getValues("firstName")} {form.getValues("lastName")}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Email:</dt>
                      <dd className="text-right font-medium">{form.getValues("adminEmail")}</dd>
                    </div>
                  </dl>
                </div>
                {error && <div className="text-sm font-medium text-destructive">{error}</div>}
              </div>
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={prevStep} disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button type="button" onClick={nextStep} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {step === 3 ? "Create Academy" : "Continue"}
          {step !== 3 && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  )
}
