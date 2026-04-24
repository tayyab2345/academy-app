"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Globe2,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent } from "@/components/ui/card"

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

const inputShellClass =
  "group flex min-h-[4.25rem] items-center rounded-[1.35rem] border border-slate-200 bg-white/86 px-4 shadow-[0_14px_35px_-28px_rgba(15,23,42,0.35)] transition-all focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-[0_20px_45px_-24px_rgba(79,70,229,0.24)] sm:h-16"

const inputClass =
  "h-full w-full border-0 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:text-lg"

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
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
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
    <Card className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/74 shadow-[0_36px_95px_-34px_rgba(99,102,241,0.32)] backdrop-blur-2xl">
      <CardContent className="p-5 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-xl">
          <div className="mb-7 flex justify-center sm:mb-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.92)_0%,rgba(238,242,255,0.86)_100%)] text-indigo-500 shadow-[0_24px_55px_-26px_rgba(99,102,241,0.42)]">
              <Landmark className="h-9 w-9" />
            </div>
          </div>

          <div className="space-y-3 text-center">
            <h2 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Create your academy
            </h2>
            <p className="text-lg text-slate-500 sm:text-[1.35rem]">
              Let&apos;s get started with a few details.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {steps.map((currentStep) => {
              const isActive = step === currentStep.id
              const isCompleted = step > currentStep.id

              return (
                <div
                  key={currentStep.id}
                  className={cn(
                    "min-w-[9rem] flex-1 rounded-[1.2rem] border px-4 py-3 shadow-sm transition-all",
                    isActive
                      ? "border-indigo-200 bg-[linear-gradient(135deg,rgba(224,231,255,0.95)_0%,rgba(243,244,255,0.88)_100%)] text-indigo-700 shadow-[0_16px_36px_-24px_rgba(79,70,229,0.35)]"
                      : isCompleted
                        ? "border-emerald-200 bg-emerald-50/80 text-emerald-700"
                        : "border-slate-200 bg-white/72 text-slate-500"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                        isActive
                          ? "bg-indigo-500 text-white"
                          : isCompleted
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-600"
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : currentStep.id}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">
                        {currentStep.title}
                      </p>
                      <p className="text-xs leading-5 opacity-80">
                        {currentStep.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8">
            <Form {...form}>
              <form className="space-y-6">
                {step === 1 ? (
                  <>
                    <FormField
                      control={form.control}
                      name="academyName"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base font-medium text-slate-700">
                            Academy name
                          </FormLabel>
                          <FormControl>
                            <div className={inputShellClass}>
                              <Building2 className="mr-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                              <input
                                placeholder="Enter your academy name"
                                disabled={isLoading}
                                className={inputClass}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subdomain"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base font-medium text-slate-700">
                            Academy subdomain
                          </FormLabel>
                          <FormControl>
                            <div className={cn(inputShellClass, "flex-col items-start gap-3 py-3 sm:flex-row sm:items-center sm:py-0")}>
                              <div className="flex w-full items-center">
                                <Globe2 className="mr-4 h-5 w-5 shrink-0 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                <input
                                  placeholder="youracademy"
                                  disabled={isLoading}
                                  onChange={handleSubdomainChange}
                                  value={field.value}
                                  className={inputClass}
                                />
                              </div>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 sm:shrink-0">
                                .academyflow.com
                              </span>
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
                            <FormDescription className="text-emerald-600">
                              Subdomain is available
                            </FormDescription>
                          )}
                          {isSubdomainAvailable === false && !subdomainCheckNotice && (
                            <FormDescription className="text-amber-600">
                              Requested subdomain is already in use. A fallback subdomain will be assigned during registration.
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
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base font-medium text-slate-700">
                            Contact email
                          </FormLabel>
                          <FormControl>
                            <div className={inputShellClass}>
                              <Mail className="mr-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                              <input
                                type="email"
                                placeholder="Enter your academy email"
                                disabled={isLoading}
                                className={inputClass}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>Public email for academy inquiries</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base font-medium text-slate-700">
                              First name
                            </FormLabel>
                            <FormControl>
                              <div className={inputShellClass}>
                                <UserRound className="mr-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                <input
                                  placeholder="Enter first name"
                                  disabled={isLoading}
                                  className={inputClass}
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base font-medium text-slate-700">
                              Last name
                            </FormLabel>
                            <FormControl>
                              <div className={inputShellClass}>
                                <UserRound className="mr-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                <input
                                  placeholder="Enter last name"
                                  disabled={isLoading}
                                  className={inputClass}
                                  {...field}
                                />
                              </div>
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
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base font-medium text-slate-700">
                            Admin email address
                          </FormLabel>
                          <FormControl>
                            <div className={inputShellClass}>
                              <Mail className="mr-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                              <input
                                type="email"
                                placeholder="Enter your admin email"
                                disabled={isLoading}
                                className={inputClass}
                                {...field}
                              />
                            </div>
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
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base font-medium text-slate-700">
                            Password
                          </FormLabel>
                          <FormControl>
                            <div className={inputShellClass}>
                              <LockKeyhole className="mr-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                              <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a strong password"
                                disabled={isLoading}
                                className={inputClass}
                                {...field}
                              />
                              <button
                                type="button"
                                className="ml-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                onClick={() => setShowPassword((current) => !current)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
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
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base font-medium text-slate-700">
                            Confirm password
                          </FormLabel>
                          <FormControl>
                            <div className={inputShellClass}>
                              <LockKeyhole className="mr-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Re-enter your password"
                                disabled={isLoading}
                                className={inputClass}
                                {...field}
                              />
                              <button
                                type="button"
                                className="ml-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                onClick={() => setShowConfirmPassword((current) => !current)}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-5">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white/78 p-5 shadow-sm">
                      <h3 className="text-lg font-semibold text-slate-900">Academy information</h3>
                      <dl className="mt-4 space-y-3 text-sm">
                        <ReviewRow label="Academy name" value={form.getValues("academyName")} />
                        <ReviewRow
                          label="Subdomain"
                          value={`${form.getValues("subdomain")}.academyflow.com`}
                        />
                        <ReviewRow label="Contact email" value={form.getValues("contactEmail")} />
                      </dl>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-white/78 p-5 shadow-sm">
                      <h3 className="text-lg font-semibold text-slate-900">Admin account</h3>
                      <dl className="mt-4 space-y-3 text-sm">
                        <ReviewRow
                          label="Name"
                          value={`${form.getValues("firstName")} ${form.getValues("lastName")}`}
                        />
                        <ReviewRow label="Email" value={form.getValues("adminEmail")} />
                      </dl>
                    </div>

                    <div className="rounded-[1.35rem] border border-indigo-100 bg-indigo-50/80 p-4 text-sm text-indigo-700">
                      We&apos;ll create your academy workspace and sign-in access with these details.
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm font-medium text-rose-600 shadow-sm">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={isLoading}
                      className="h-14 rounded-[1.2rem] border-slate-200 px-6 text-base"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  ) : (
                    <div className="hidden sm:block" />
                  )}

                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={isLoading}
                    className={cn(
                      "h-14 rounded-[1.2rem] border-0 px-8 text-base font-semibold text-white shadow-[0_18px_45px_-20px_rgba(79,70,229,0.55)] transition-transform duration-200 hover:-translate-y-0.5",
                      "bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_55%,#7c3aed_100%)] hover:opacity-95"
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <span>{step === 3 ? "Create my academy" : "Continue"}</span>
                        <ArrowRight className="ml-3 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <div className="mt-8 space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Ready when you are
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="rounded-[1.35rem] border border-slate-200 bg-white/72 px-5 py-4 text-center shadow-sm">
              <p className="text-base text-slate-600">
                Already have an academy?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-indigo-600 transition hover:text-indigo-700"
                >
                  Sign in
                </Link>
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 text-center text-sm text-slate-500">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              <p>Secure setup. You can update academy settings any time.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}
