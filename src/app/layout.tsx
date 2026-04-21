import type { Metadata, Viewport } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAppBaseUrl } from "@/lib/app-url"
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt"
import { Providers } from "./providers"
import "./globals.css"

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
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body>
        <Providers session={session}>
          {children}
          <PWAInstallPrompt />
        </Providers>
      </body>
    </html>
  )
}
