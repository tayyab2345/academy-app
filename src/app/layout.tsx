import type { Metadata, Viewport } from "next"
import dynamic from "next/dynamic"
import { getAppBaseUrl } from "@/lib/app-url"
import { AppStartupSplash } from "@/components/branding/app-startup-splash"
import { Providers } from "./providers"
import "./globals.css"

const PWAInstallPrompt = dynamic(
  () => import("@/components/pwa/pwa-install-prompt").then((mod) => mod.PWAInstallPrompt),
  {
    ssr: false,
  }
)

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  applicationName: "AcademyFlow",
  title: {
    default: "AcademyFlow",
    template: "%s - AcademyFlow",
  },
  description: "Academy management platform for academics, finance, payroll, results, and communication.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AcademyFlow",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/icons/icon-192x192.png"],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#059669",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f4fbf8] text-foreground antialiased">
        <Providers session={null}>
          <AppStartupSplash>{children}</AppStartupSplash>
          <PWAInstallPrompt />
        </Providers>
      </body>
    </html>
  )
}
