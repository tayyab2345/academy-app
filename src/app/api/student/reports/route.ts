import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getStudentReportsPageData } from "@/lib/reports/portal-report-data"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10)
    const reportType = searchParams.get("reportType") || ""
    const classId = searchParams.get("classId") || ""

    const data = await getStudentReportsPageData({
      userId: session.user.id,
      page,
      limit,
      reportType,
      classId,
    })

    if (!data) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 403 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to fetch student reports:", error)
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    )
  }
}
