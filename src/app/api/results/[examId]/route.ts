import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getManageableExamWhereForUser } from "@/lib/results/result-access"
import { calculateGrade, calculatePercentage } from "@/lib/results/result-utils"

const updateExamSchema = z.object({
  name: z.string().trim().min(2, "Exam name must be at least 2 characters"),
  type: z.enum(["quiz", "monthly", "midterm", "final", "annual"]),
  examDate: z.string().min(1, "Exam date is required"),
  totalMarks: z.coerce.number().positive("Total marks must be greater than zero"),
  notes: z.string().trim().optional().nullable(),
})

export async function PATCH(
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
    const validated = updateExamSchema.safeParse(body)

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
        results: {
          select: {
            id: true,
            obtainedMarks: true,
          },
        },
      },
    })

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    const examDate = new Date(validated.data.examDate)

    if (Number.isNaN(examDate.getTime())) {
      return NextResponse.json({ error: "Invalid exam date" }, { status: 400 })
    }

    const totalMarks = validated.data.totalMarks

    await prisma.$transaction([
      prisma.exam.update({
        where: { id: exam.id },
        data: {
          name: validated.data.name,
          type: validated.data.type,
          examDate,
          totalMarks,
          notes: validated.data.notes?.trim() || null,
        },
      }),
      ...exam.results.map((result) => {
        const obtainedMarks = Number(result.obtainedMarks)
        const percentage = calculatePercentage(obtainedMarks, totalMarks)
        const grade = calculateGrade(percentage)

        return prisma.examResult.update({
          where: { id: result.id },
          data: {
            totalMarks,
            percentage,
            grade,
          },
        })
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update exam:", error)
    return NextResponse.json(
      { error: "Failed to update exam" },
      { status: 500 }
    )
  }
}
