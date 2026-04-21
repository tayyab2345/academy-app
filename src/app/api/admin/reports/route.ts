import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getAdminReportsPageData,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { getPrivateCacheHeaders } from "@/lib/http-cache"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const academyId = session.user.academyId
    const searchParams = req.nextUrl.searchParams
    const page = parsePositiveInt(searchParams.get("page") || undefined, 1)
    const limit = parsePositiveInt(
      searchParams.get("limit") || undefined,
      DEFAULT_PAGE_SIZE,
      100
    )
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const reportType = searchParams.get("reportType") || ""
    const classId = searchParams.get("classId") || ""
    const studentId = searchParams.get("studentId") || ""
    const teacherId = searchParams.get("teacherId") || ""

    const data = await getAdminReportsPageData({
      academyId,
      page,
      limit,
      search,
      status,
      reportType,
      classId,
      studentId,
      teacherId,
    })

    return NextResponse.json(data, {
      headers: getPrivateCacheHeaders(30),
    })
  } catch (error) {
    console.error("Failed to fetch admin reports:", error)
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    )
  }
}
