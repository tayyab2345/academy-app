import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import { getAdminFinanceSummaryData } from "@/lib/finance/admin-finance-data"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const currency = searchParams.get("currency") || ""
    const data = await getAdminFinanceSummaryData(session.user.academyId)

    const summary =
      currency.length > 0
        ? data.summaryByCurrency.find((item) => item.currency === currency) || {
            currency,
            totalInvoiced: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            totalOverdue: 0,
            invoiceCount: 0,
            paidCount: 0,
            overdueCount: 0,
            partialCount: 0,
            pendingSubmissions: 0,
          }
        : data.summary

    return NextResponse.json(
      {
        summary,
        summaryByCurrency: data.summaryByCurrency,
        overdueCount: data.overdueCount,
      },
      {
        headers: getPrivateCacheHeaders(60),
      }
    )
  } catch (error) {
    console.error("Failed to fetch finance summary:", error)
    return NextResponse.json(
      { error: "Failed to fetch finance summary" },
      { status: 500 }
    )
  }
}
