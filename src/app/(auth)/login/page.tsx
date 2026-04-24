import { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Sign In - AcademyFlow",
  description: "Sign in to your academy account",
}

function LoginFormFallback() {
  return (
    <div className="mx-auto w-full max-w-[860px]">
      <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_30px_80px_-32px_rgba(79,70,229,0.3)] backdrop-blur-xl sm:p-8 lg:p-12">
        <div className="mx-auto max-w-xl animate-pulse space-y-6">
          <div className="h-12 w-40 rounded-full bg-slate-200/80" />
          <div className="space-y-3">
            <div className="h-10 w-64 rounded-xl bg-slate-200/80" />
            <div className="h-6 w-80 rounded-xl bg-slate-200/60" />
          </div>
          <div className="space-y-4">
            <div className="h-24 rounded-[1.5rem] bg-slate-100/90" />
            <div className="h-24 rounded-[1.5rem] bg-slate-100/90" />
            <div className="h-14 rounded-[1.25rem] bg-slate-200/80" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center py-8 sm:py-12">
      <div className="w-full">
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
