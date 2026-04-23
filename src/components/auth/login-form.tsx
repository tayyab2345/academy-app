"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Enter your email and password to sign in
        </CardDescription>
      </CardHeader>
      <CardContent>
        {registered && (
          <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 rounded-md">
            Academy created successfully!
            {assignedSubdomain ? ` Assigned subdomain: ${assignedSubdomain}.academyflow.com.` : ""}
            {" "}Please sign in with your admin credentials.
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="admin@academy.com"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <div className="text-sm font-medium text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-muted-foreground text-center">
          Don&apos;t have an academy?{" "}
          <a
            href="/register"
            className="text-primary underline-offset-4 hover:underline"
          >
            Create one
          </a>
        </div>
      </CardFooter>
    </Card>
  )
}
