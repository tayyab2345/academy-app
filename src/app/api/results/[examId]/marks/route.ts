import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getManageableExamWhereForUser } from "@/lib/results/result-access"
import { calculateGrade, calculatePercentage } from "@/lib/results/result-utils"

const marksEntrySchema = z.object({
  studentProfileId: z.string().min(1),
  obtainedMarks: z.number().min(0).nullable(),
  remarks: z.string().optional().nullable(),
})

const saveMarksSchema = z.object({
  entries: z.array(marksEntrySchema).min(1),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin" && session.user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const validated = saveMarksSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const where = await getManageableExamWhereForUser({
      id: session.user.id,
      role: session.user.role,
      academyId: session.user.academyId,
    }, params.examId)

    if (!where) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const exam = await prisma.exam.findFirst({
      where,
      select: {
        id: true,
        classId: true,
        totalMarks: true,
      },
    })

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        classId: exam.classId,
        status: "active",
      },
      select: {
        studentProfileId: true,
      },
    })

    const allowedStudentIds = new Set(
      activeEnrollments.map((enrollment) => enrollment.studentProfileId)
    )

    for (const entry of validated.data.entries) {
      if (!allowedStudentIds.has(entry.studentProfileId)) {
        return NextResponse.json(
          { error: "One or more students are not enrolled in this class" },
          { status: 400 }
        )
      }

      if (
        entry.obtainedMarks !== null &&
        entry.obtainedMarks > Number(exam.totalMarks)
      ) {
        return NextResponse.json(
          { error: "Obtained marks cannot exceed total marks" },
          { status: 400 }
        )
      }
    }

    await prisma.$transaction(
      validated.data.entries.map((entry) => {
        if (entry.obtainedMarks === null || Number.isNaN(entry.obtainedMarks)) {
          return prisma.examResult.deleteMany({
            where: {
              examId: exam.id,
              studentProfileId: entry.studentProfileId,
            },
          })
        }

        const percentage = calculatePercentage(
          entry.obtainedMarks,
          Number(exam.totalMarks)
        )
        const grade = calculateGrade(percentage)

        return prisma.examResult.upsert({
          where: {
            examId_studentProfileId: {
              examId: exam.id,
              studentProfileId: entry.studentProfileId,
            },
          },
          update: {
            obtainedMarks: entry.obtainedMarks,
            totalMarks: exam.totalMarks,
            percentage,
            grade,
            remarks: entry.remarks?.trim() || null,
          },
          create: {
            examId: exam.id,
            studentProfileId: entry.studentProfileId,
            obtainedMarks: entry.obtainedMarks,
            totalMarks: exam.totalMarks,
            percentage,
            grade,
            remarks: entry.remarks?.trim() || null,
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      savedCount: validated.data.entries.filter(
        (entry) => entry.obtainedMarks !== null && !Number.isNaN(entry.obtainedMarks)
      ).length,
    })
  } catch (error) {
    console.error("Failed to save exam marks:", error)
    return NextResponse.json(
      { error: "Failed to save exam marks" },
      { status: 500 }
    )
  }
}
