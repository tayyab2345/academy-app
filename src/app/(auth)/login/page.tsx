import { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Sign In - AcademyFlow",
  description: "Sign in to your academy account",
}

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Loading sign in</h2>
        <p className="text-sm text-muted-foreground">
          Preparing the sign-in form...
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            AcademyFlow
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your academy with ease
          </p>
        </div>
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
