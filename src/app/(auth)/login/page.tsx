import { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Sign In - AcademyFlow",
  description: "Sign in to your academy account",
}

function LoginFormFallback() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <div className="animate-pulse space-y-6">
          <div className="mx-auto h-10 w-44 rounded-md bg-muted" />
          <div className="space-y-3">
            <div className="mx-auto h-8 w-56 rounded-md bg-muted" />
            <div className="mx-auto h-4 w-64 rounded-md bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="h-10 rounded-md bg-muted" />
            <div className="h-10 rounded-md bg-muted" />
            <div className="h-10 rounded-md bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center py-8 sm:py-12">
      <div className="w-full">
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
