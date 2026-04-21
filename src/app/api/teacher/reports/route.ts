import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTeacherReportsPageData } from "@/lib/reports/portal-report-data"

const createReportSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  studentProfileId: z.string().min(1, "Student is required"),
  reportType: z.enum(["daily", "weekly", "monthly", "term"]),
  reportDate: z.string().or(z.date()),
  periodStart: z.string().or(z.date()),
  periodEnd: z.string().or(z.date()),
  sections: z.array(
    z.object({
      sectionType: z.enum([
        "attendance",
        "homework",
        "strengths",
        "improvements",
        "next_focus",
        "teacher_remarks",
        "behavior",
        "grades",
      ]),
      content: z.string().optional(),
      contentJson: z.any().optional(),
      rating: z.number().min(1).max(5).optional().nullable(),
      orderIndex: z.number(),
    })
  ),
})

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10)
    const status = searchParams.get("status") || ""
    const reportType = searchParams.get("reportType") || ""
    const classId = searchParams.get("classId") || ""
    const studentId = searchParams.get("studentId") || ""

    const data = await getTeacherReportsPageData({
      userId: session.user.id,
      page,
      limit,
      status,
      reportType,
      classId,
      studentId,
    })

    if (!data) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 403 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to fetch reports:", error)
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const validated = createReportSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const classTeacher = await prisma.classTeacher.findUnique({
      where: {
        classId_teacherProfileId: {
          classId: validated.data.classId,
          teacherProfileId: teacherProfile.id,
        },
      },
    })

    if (!classTeacher) {
      return NextResponse.json(
        { error: "You are not assigned to this class" },
        { status: 403 }
      )
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentProfileId_classId: {
          studentProfileId: validated.data.studentProfileId,
          classId: validated.data.classId,
        },
      },
    })

    if (!enrollment || enrollment.status !== "active") {
      return NextResponse.json(
        { error: "Student is not enrolled in this class" },
        { status: 400 }
      )
    }

    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.report.create({
        data: {
          classId: validated.data.classId,
          studentProfileId: validated.data.studentProfileId,
          teacherProfileId: teacherProfile.id,
          reportType: validated.data.reportType,
          reportDate: new Date(validated.data.reportDate),
          periodStart: new Date(validated.data.periodStart),
          periodEnd: new Date(validated.data.periodEnd),
          status: "draft",
        },
      })

      if (validated.data.sections.length > 0) {
        await tx.reportSection.createMany({
          data: validated.data.sections.map((section) => ({
            reportId: newReport.id,
            sectionType: section.sectionType,
            content: section.content,
            contentJson: section.contentJson,
            rating: section.rating,
            orderIndex: section.orderIndex,
          })),
        })
      }

      return newReport
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error("Failed to create report:", error)
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    )
  }
}
