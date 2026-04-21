import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getManageableClassWhereForUser } from "@/lib/results/result-access"

const createExamSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: z.string().trim().min(2, "Exam name must be at least 2 characters"),
  type: z.enum(["quiz", "monthly", "midterm", "final", "annual"]),
  examDate: z.string().min(1, "Exam date is required"),
  totalMarks: z.coerce.number().positive("Total marks must be greater than zero"),
  notes: z.string().trim().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin" && session.user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const validated = createExamSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const classWhere = await getManageableClassWhereForUser({
      id: session.user.id,
      role: session.user.role,
      academyId: session.user.academyId,
    }, validated.data.classId)

    if (!classWhere) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const classRecord = await prisma.class.findFirst({
      where: classWhere,
      select: {
        id: true,
        academyId: true,
        courseId: true,
      },
    })

    if (!classRecord) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    const examDate = new Date(validated.data.examDate)

    if (Number.isNaN(examDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid exam date" },
        { status: 400 }
      )
    }

    const exam = await prisma.exam.create({
      data: {
        academyId: classRecord.academyId,
        classId: classRecord.id,
        courseId: classRecord.courseId,
        name: validated.data.name,
        type: validated.data.type,
        examDate,
        totalMarks: validated.data.totalMarks,
        notes: validated.data.notes?.trim() || null,
        createdByUserId: session.user.id,
      },
      select: {
        id: true,
      },
    })

    return NextResponse.json({ exam }, { status: 201 })
  } catch (error) {
    console.error("Failed to create exam:", error)
    return NextResponse.json(
      { error: "Failed to create exam" },
      { status: 500 }
    )
  }
}
