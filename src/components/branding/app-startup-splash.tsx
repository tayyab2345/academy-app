"use client"

import { useEffect, useState } from "react"
import { AcademyLogo } from "@/components/ui/academy-logo"
import { cn } from "@/lib/utils"

const SPLASH_STORAGE_KEY = "academyflow-startup-splash-v1"
const DEFAULT_SPLASH_DURATION_MS = 1900
const QUICK_SPLASH_DURATION_MS = 900
const EXIT_DURATION_MS = 550

export function AppStartupSplash({
  children,
}: {
  children: React.ReactNode
}) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const hasSeenSplash = window.sessionStorage.getItem(SPLASH_STORAGE_KEY) === "1"

    if (!hasSeenSplash) {
      window.sessionStorage.setItem(SPLASH_STORAGE_KEY, "1")
    }

    const displayDuration = prefersReducedMotion
      ? 450
      : hasSeenSplash
        ? QUICK_SPLASH_DURATION_MS
        : DEFAULT_SPLASH_DURATION_MS

    const exitTimer = window.setTimeout(() => {
      setIsExiting(true)
    }, displayDuration)

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false)
    }, displayDuration + EXIT_DURATION_MS)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  return (
    <>
      <div
        className={cn(
          "transition-opacity duration-500",
          isVisible ? "pointer-events-none select-none opacity-0" : "opacity-100"
        )}
      >
        {children}
      </div>

      {isVisible ? (
        <div
          className={cn(
            "fixed inset-0 z-[120] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.28),_transparent_36%),radial-gradient(circle_at_85%_15%,_rgba(17,24,39,0.1),_transparent_24%),linear-gradient(180deg,#f4fbf8_0%,#eefbf4_45%,#ffffff_100%)]",
            isExiting && "academy-splash-overlay-exit"
          )}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="academy-splash-orb absolute left-[8%] top-[12%] h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="academy-splash-orb academy-splash-orb-delay absolute bottom-[12%] right-[12%] h-52 w-52 rounded-full bg-slate-900/8 blur-3xl" />
          </div>

          <div className="relative flex min-h-screen items-center justify-center px-6">
            <div className={cn("w-full max-w-sm text-center", isExiting && "academy-splash-shell-exit")}>
              <div className="academy-splash-logo mx-auto flex h-32 w-32 items-center justify-center rounded-[2.25rem] border border-white/70 bg-white/60 p-4 shadow-[0_40px_100px_-32px_rgba(5,150,105,0.45)] backdrop-blur-md">
                <AcademyLogo
                  name="AcademyFlow"
                  className="h-full w-full rounded-[1.7rem] shadow-none"
                />
              </div>

              <div className="academy-splash-copy mt-8 space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                  AcademyFlow
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[2.75rem]">
                  Your academy, ready.
                </h1>
                <p className="mx-auto max-w-xs text-sm leading-6 text-slate-600 sm:max-w-sm sm:text-base">
                  Loading classes, communication, finance, and reports into one calm workspace.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
