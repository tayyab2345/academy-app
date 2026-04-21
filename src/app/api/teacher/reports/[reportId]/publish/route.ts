import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { sendReportPublishedWorkflow } from "@/lib/email/email-workflows"
import { notifyReportPublished } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

const publishReportSchema = z.object({
  publishDate: z.string().or(z.date()).optional(),
})

export async function POST(
  req: NextRequest,
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
      include: {
        sections: true,
      },
    })

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    if (report.teacherProfileId !== teacherProfile.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (report.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft reports can be published" },
        { status: 400 }
      )
    }

    if (report.sections.length === 0) {
      return NextResponse.json(
        { error: "Cannot publish a report with no sections" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const validated = publishReportSchema.safeParse(body)

    const publishedAt =
      validated.success && validated.data.publishDate
        ? new Date(validated.data.publishDate)
        : new Date()

    const updatedReport = await prisma.report.update({
      where: { id: params.reportId },
      data: {
        status: "published",
        publishedAt,
      },
    })

    try {
      await notifyReportPublished(params.reportId)
    } catch (notificationError) {
      console.error("Failed to send report publish notifications:", notificationError)
    }

    void sendReportPublishedWorkflow(params.reportId).catch((workflowError) => {
      console.error("Failed to send report published emails:", workflowError)
    })

    return NextResponse.json({ report: updatedReport })
  } catch (error) {
    console.error("Failed to publish report:", error)
    return NextResponse.json(
      { error: "Failed to publish report" },
      { status: 500 }
    )
  }
}
