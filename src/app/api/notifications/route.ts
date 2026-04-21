import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import { getNotificationsPageData } from "@/lib/notifications/notification-data"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.max(
      1,
      Number.parseInt(searchParams.get("limit") || "20", 10)
    )
    const unreadOnly = searchParams.get("unread") === "true"
    const type = searchParams.get("type") || ""

    const data = await getNotificationsPageData({
      userId: session.user.id,
      page,
      limit,
      unreadOnly,
      type,
    })

    return NextResponse.json(data, {
      headers: getPrivateCacheHeaders(30),
    })
  } catch (error) {
    console.error("Failed to fetch notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}
