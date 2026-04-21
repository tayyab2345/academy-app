import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAdminDashboardOverviewData } from "@/lib/admin/admin-data"
import { getPrivateCacheHeaders } from "@/lib/http-cache"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const overview = await getAdminDashboardOverviewData(session.user.academyId)

    return NextResponse.json(overview, {
      headers: getPrivateCacheHeaders(60),
    })
  } catch (error) {
    console.error("Failed to fetch admin dashboard overview:", error)
    return NextResponse.json(
      { error: "Failed to fetch admin dashboard overview" },
      { status: 500 }
    )
  }
}
