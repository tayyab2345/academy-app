import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getManualPaymentsList } from "@/lib/manual-payments-data"

const allowedStatuses = new Set(["pending", "approved", "rejected"])

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10)
    const status = searchParams.get("status") || ""
    const invoiceId = searchParams.get("invoiceId") || ""

    const data = await getManualPaymentsList({
      academyId: session.user.academyId,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
      status: allowedStatuses.has(status) ? status : undefined,
      invoiceId: invoiceId || undefined,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to fetch manual payments:", error)
    return NextResponse.json(
      { error: "Failed to fetch manual payments" },
      { status: 500 }
    )
  }
}
