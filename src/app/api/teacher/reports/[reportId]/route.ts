import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const updateReportSchema = z.object({
  classId: z.string().min(1).optional(),
  studentProfileId: z.string().min(1).optional(),
  reportType: z.enum(["daily", "weekly", "monthly", "term"]).optional(),
  reportDate: z.string().or(z.date()).optional(),
  periodStart: z.string().or(z.date()).optional(),
  periodEnd: z.string().or(z.date()).optional(),
  sections: z
    .array(
      z.object({
        id: z.string().optional(),
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
    )
    .optional(),
})

export async function GET(
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
      include: {
        studentProfile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        class: {
          include: {
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        teacherProfile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        sections: {
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    if (report.teacherProfileId !== teacherProfile.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error("Failed to fetch report:", error)
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const existingReport = await prisma.report.findUnique({
      where: { id: params.reportId },
    })

    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    if (existingReport.teacherProfileId !== teacherProfile.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (existingReport.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft reports can be edited" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const validated = updateReportSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const nextClassId = validated.data.classId ?? existingReport.classId
    const nextStudentProfileId =
      validated.data.studentProfileId ?? existingReport.studentProfileId

    const classTeacher = await prisma.classTeacher.findUnique({
      where: {
        classId_teacherProfileId: {
          classId: nextClassId,
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
          studentProfileId: nextStudentProfileId,
          classId: nextClassId,
        },
      },
    })

    if (!enrollment || enrollment.status !== "active") {
      return NextResponse.json(
        { error: "Student is not enrolled in this class" },
        { status: 400 }
      )
    }

    const { sections, ...reportData } = validated.data

    const report = await prisma.$transaction(async (tx) => {
      const updateData: any = { ...reportData }

      if (updateData.reportDate) {
        updateData.reportDate = new Date(updateData.reportDate)
      }
      if (updateData.periodStart) {
        updateData.periodStart = new Date(updateData.periodStart)
      }
      if (updateData.periodEnd) {
        updateData.periodEnd = new Date(updateData.periodEnd)
      }

      const updatedReport = await tx.report.update({
        where: { id: params.reportId },
        data: updateData,
      })

      if (sections) {
        await tx.reportSection.deleteMany({
          where: { reportId: params.reportId },
        })

        if (sections.length > 0) {
          await tx.reportSection.createMany({
            data: sections.map((section) => ({
              reportId: params.reportId,
              sectionType: section.sectionType,
              content: section.content,
              contentJson: section.contentJson,
              rating: section.rating,
              orderIndex: section.orderIndex,
            })),
          })
        }
      }

      return updatedReport
    })

    return NextResponse.json({ report })
  } catch (error) {
    console.error("Failed to update report:", error)
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    if (report.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft reports can be deleted" },
        { status: 400 }
      )
    }

    await prisma.report.delete({
      where: { id: params.reportId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete report:", error)
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    )
  }
}
