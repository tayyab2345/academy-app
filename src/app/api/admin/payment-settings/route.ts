import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAcademyPaymentSettings } from "@/lib/manual-payments-data"

const paymentSettingsSchema = z.object({
  jazzCashNumber: z.string().trim().optional().nullable(),
  easyPaisaNumber: z.string().trim().optional().nullable(),
  bankName: z.string().trim().optional().nullable(),
  bankAccountTitle: z.string().trim().optional().nullable(),
  bankAccountNumber: z.string().trim().optional().nullable(),
  iban: z.string().trim().optional().nullable(),
  paymentInstructions: z.string().trim().optional().nullable(),
})

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await getAcademyPaymentSettings(session.user.academyId)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Failed to fetch payment settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment settings" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = paymentSettingsSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const settings = await prisma.academyPaymentSettings.upsert({
      where: { academyId: session.user.academyId },
      update: validated.data,
      create: {
        academyId: session.user.academyId,
        ...validated.data,
      },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Failed to update payment settings:", error)
    return NextResponse.json(
      { error: "Failed to update payment settings" },
      { status: 500 }
    )
  }
}
