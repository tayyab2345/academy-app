"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Smartphone, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
}

function isIosDevice() {
  if (typeof window === "undefined") {
    return false
  }

  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // @ts-expect-error iOS standalone
    window.navigator.standalone === true
  )
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const dismissedFlag = window.localStorage.getItem("academyflow-pwa-dismissed")
    setIsDismissed(dismissedFlag === "1")
    setIsStandalone(isStandaloneMode())

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => console.error("Failed to register service worker:", error))
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
      window.localStorage.removeItem("academyflow-pwa-dismissed")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const showIosHint = useMemo(
    () => !isStandalone && !deferredPrompt && isIosDevice(),
    [deferredPrompt, isStandalone]
  )

  if (isStandalone || isDismissed || (!deferredPrompt && !showIosHint)) {
    return null
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice.outcome !== "accepted") {
      setIsDismissed(true)
      window.localStorage.setItem("academyflow-pwa-dismissed", "1")
    }

    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setIsDismissed(true)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("academyflow-pwa-dismissed", "1")
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-[120] px-4">
      <div className="mx-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          {showIosHint ? (
            <Smartphone className="h-5 w-5" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install AcademyFlow</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {showIosHint
              ? "On iPhone, tap Share and choose Add to Home Screen for an app-like experience."
              : "Install AcademyFlow for faster launch, standalone mode, and home-screen access."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!showIosHint ? (
              <Button size="sm" onClick={handleInstall}>
                <Download className="mr-2 h-4 w-4" />
                Install App
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={handleDismiss}>
              Maybe Later
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss install prompt"
          className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
