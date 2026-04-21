import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const subdomain = searchParams.get("subdomain")

  if (!subdomain || subdomain.length < 3) {
    return NextResponse.json(
      { error: "Invalid subdomain" },
      { status: 400 }
    )
  }

  // Validate subdomain format
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return NextResponse.json(
      { available: false, error: "Invalid characters" },
      { status: 200 }
    )
  }

  const existingAcademy = await prisma.academy.findUnique({
    where: { subdomain },
  })

  return NextResponse.json({
    available: !existingAcademy,
  })
}
