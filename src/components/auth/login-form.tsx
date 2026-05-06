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
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
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
import { AcademyLogo } from "@/components/ui/academy-logo"

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
    <Card className="mx-auto w-full max-w-md overflow-hidden">
      <CardHeader className="space-y-5 text-center">
        <Link href="/" className="mx-auto flex items-center gap-3">
          <AcademyLogo
            name="AcademyFlow"
            primaryColor="#059669"
            className="h-10 w-10"
            iconClassName="h-5 w-5"
          />
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            AcademyFlow
          </span>
        </Link>

        <div className="space-y-2">
          <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back
          </CardTitle>
          <CardDescription className="text-sm">
            Sign in to continue to your academy dashboard
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
          {registered && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Academy created successfully!
              {assignedSubdomain ? ` Assigned subdomain: ${assignedSubdomain}.academyflow.com.` : ""}
              {" "}Please sign in with your admin credentials.
            </div>
          )}

          {notice && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              {notice}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email address
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          disabled={isLoading}
                          className="pl-10"
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
                  <FormItem>
                    <FormLabel>
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          disabled={isLoading}
                          className="pl-10 pr-11"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
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
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3">
                  <Checkbox
                    checked={rememberEmail}
                    onCheckedChange={(checked) => setRememberEmail(checked === true)}
                  />
                  <span>Remember me</span>
                </label>

                <span className="text-primary">
                  Need help? Contact your admin
                </span>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 space-y-4 border-t pt-5">
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an academy account?{" "}
              <Link
                href="/register/academy"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Create academy
              </Link>
            </p>

            <div className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p>Secure role-based access for academy teams</p>
            </div>
          </div>
      </CardContent>
    </Card>
  )
}
