"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type FormValues = z.infer<typeof formSchema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showPassword, setShowPassword] = React.useState(false)
  const [rememberEmail, setRememberEmail] = React.useState(true)

  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const registered = searchParams.get("registered")
  const notice = searchParams.get("notice")
  const assignedSubdomain = searchParams.get("subdomain")

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  React.useEffect(() => {
    const savedEmail = window.localStorage.getItem("academyflow-remembered-email")

    if (savedEmail) {
      form.setValue("email", savedEmail)
      setRememberEmail(true)
    }
  }, [form])

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        if (result.error === "ACADEMY_DEACTIVATED") {
          router.push("/academy-deactivated?blocked=1")
          router.refresh()
          setIsLoading(false)
          return
        }

        if (
          result.error === "AUTHENTICATION_UNAVAILABLE" ||
          result.error === "Configuration" ||
          result.error === "JWT_SESSION_ERROR"
        ) {
          setError("Sign in is temporarily unavailable. Please try again shortly.")
          setIsLoading(false)
          return
        }

        setError("Invalid email or password")
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        if (rememberEmail) {
          window.localStorage.setItem("academyflow-remembered-email", values.email)
        } else {
          window.localStorage.removeItem("academyflow-remembered-email")
        }

        let destination = callbackUrl

        if (result.url) {
          const resolvedUrl = new URL(result.url, window.location.origin)

          if (resolvedUrl.origin !== window.location.origin) {
            window.location.assign(result.url)
            return
          }

          destination = `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`
        }

        router.replace(destination)
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-[860px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/68 shadow-[0_30px_80px_-32px_rgba(79,70,229,0.3)] backdrop-blur-2xl">
      <CardContent className="p-5 sm:p-8 lg:p-12">
        <div className="mx-auto max-w-xl">
          <div className="mb-8 flex items-center justify-center gap-4 text-center sm:mb-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#34d399_0%,#4f46e5_100%)] p-2.5 shadow-[0_20px_40px_-20px_rgba(79,70,229,0.6)]">
              <img
                src="/icons/app-icon.svg"
                alt="AcademyFlow"
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
            <div className="text-left">
              <p className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.2rem]">
                AcademyFlow
              </p>
            </div>
          </div>

          <div className="mb-8 space-y-3 text-center sm:mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Welcome back
            </h1>
            <p className="text-lg text-slate-500 sm:text-[1.35rem]">
              Sign in to continue to your academy
            </p>
          </div>

          {registered && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-700 shadow-sm">
              Academy created successfully!
              {assignedSubdomain ? ` Assigned subdomain: ${assignedSubdomain}.academyflow.com.` : ""}
              {" "}Please sign in with your admin credentials.
            </div>
          )}

          {notice && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-700 shadow-sm">
              {notice}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-medium text-slate-700">
                      Email address
                    </FormLabel>
                    <FormControl>
                      <div className="group flex h-16 items-center rounded-[1.35rem] border border-slate-200 bg-white/85 px-5 shadow-[0_14px_35px_-26px_rgba(15,23,42,0.45)] transition-all focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-[0_20px_45px_-24px_rgba(79,70,229,0.25)]">
                        <Mail className="mr-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                        <input
                          type="email"
                          placeholder="you@example.com"
                          disabled={isLoading}
                          className="h-full w-full border-0 bg-transparent text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
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
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-medium text-slate-700">
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="group flex h-16 items-center rounded-[1.35rem] border border-slate-200 bg-white/85 px-5 shadow-[0_14px_35px_-26px_rgba(15,23,42,0.45)] transition-all focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-[0_20px_45px_-24px_rgba(79,70,229,0.25)]">
                        <LockKeyhole className="mr-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="************"
                          disabled={isLoading}
                          className="h-full w-full border-0 bg-transparent text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm font-medium text-rose-600 shadow-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3">
                  <Checkbox
                    checked={rememberEmail}
                    onCheckedChange={(checked) => setRememberEmail(checked === true)}
                    className="h-5 w-5 rounded-md border-indigo-300 data-[state=checked]:bg-indigo-500 data-[state=checked]:text-white"
                  />
                  <span className="text-base text-slate-700">Remember me</span>
                </label>

                <span className="text-base text-indigo-600">
                  Need help? Contact your admin
                </span>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "h-16 w-full rounded-[1.35rem] border-0 text-xl font-semibold text-white shadow-[0_18px_45px_-20px_rgba(79,70,229,0.55)] transition-transform duration-200 hover:-translate-y-0.5",
                  "bg-[linear-gradient(90deg,#34d399_0%,#3b82f6_55%,#6366f1_100%)] hover:opacity-95"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Signing in
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Secure academy access
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="rounded-[1.35rem] border border-slate-200 bg-white/70 px-5 py-4 text-center shadow-sm">
              <p className="text-base text-slate-600">
                Don&apos;t have an academy account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-indigo-600 transition hover:text-indigo-700"
                >
                  Create academy
                </Link>
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 text-center text-sm text-slate-500">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              <p>Your data is protected with enterprise-grade security</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
