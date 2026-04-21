import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!teacherProfile) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 403 }
      )
    }

    const report = await prisma.report.findUnique({
      where: { id: params.reportId },
    })

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    if (report.teacherProfileId !== teacherProfile.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (report.status === "draft") {
      return NextResponse.json(
        { error: "Draft reports cannot be archived. Publish them first." },
        { status: 400 }
      )
    }

    if (report.status === "archived") {
      return NextResponse.json(
        { error: "Report is already archived" },
        { status: 400 }
      )
    }

    const updatedReport = await prisma.report.update({
      where: { id: params.reportId },
      data: {
        status: "archived",
      },
    })

    return NextResponse.json({ report: updatedReport })
  } catch (error) {
    console.error("Failed to archive report:", error)
    return NextResponse.json(
      { error: "Failed to archive report" },
      { status: 500 }
    )
  }
}
