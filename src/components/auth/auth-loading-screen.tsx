"use client"

import { Loader2 } from "lucide-react"

export function AuthLoadingScreen({
  title = "Opening your portal",
  description = "Checking your session and preparing the right dashboard...",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.14),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)] px-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-xl backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div className="mt-5 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/90">
            AcademyFlow
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
