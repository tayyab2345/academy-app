import fs from "fs"
import os from "os"
import path from "path"
import chromium from "@sparticuz/chromium"
import type { Browser } from "puppeteer-core"
import { defaultPDFOptions, PDFGenerationOptions } from "@/lib/pdf/pdf-utils"

function getLocalBrowserCandidates() {
  const homeDir = os.homedir()

  return [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(homeDir, "AppData", "Local", "Google", "Chrome", "Application", "chrome.exe"),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    path.join(homeDir, "AppData", "Local", "Microsoft", "Edge", "Application", "msedge.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter((candidate): candidate is string => Boolean(candidate))
}

function resolveLocalBrowserPath() {
  return getLocalBrowserCandidates().find((candidate) => fs.existsSync(candidate)) || null
}

export async function launchPdfBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core")
  const localExecutablePath = resolveLocalBrowserPath()

  if (localExecutablePath) {
    return puppeteer.launch({
      executablePath: localExecutablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    })
  }

  const executablePath = await chromium.executablePath()

  if (!executablePath) {
    throw new Error(
      "No browser executable was found for PDF generation. Set PUPPETEER_EXECUTABLE_PATH or configure a serverless Chromium runtime."
    )
  }

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: [...chromium.args, "--font-render-hinting=none"],
  })
}

export async function renderPdfFromHtml(
  html: string,
  options: PDFGenerationOptions = defaultPDFOptions
) {
  const browser = await launchPdfBrowser()

  try {
    const page = await browser.newPage()
    await page.emulateMediaType("screen")
    await page.setContent(html, { waitUntil: "networkidle0" })

    const pdf = await page.pdf({
      format: options.format ?? defaultPDFOptions.format,
      landscape: options.landscape ?? defaultPDFOptions.landscape,
      printBackground: true,
      margin: {
        top: options.margin?.top ?? defaultPDFOptions.margin?.top,
        right: options.margin?.right ?? defaultPDFOptions.margin?.right,
        bottom: options.margin?.bottom ?? defaultPDFOptions.margin?.bottom,
        left: options.margin?.left ?? defaultPDFOptions.margin?.left,
      },
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
