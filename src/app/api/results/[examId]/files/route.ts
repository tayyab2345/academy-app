import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getManageableExamWhereForUser } from "@/lib/results/result-access"
import { isStoredDocumentUrl } from "@/lib/storage/document-storage"

const createResultFileSchema = z.object({
  fileUrl: z.string().trim().min(1, "File URL is required"),
  fileType: z.enum(["monthly_report", "annual_report", "marksheet"]),
  mimeType: z.string().trim().min(1, "Mime type is required"),
  studentProfileId: z.string().trim().optional().nullable(),
})

export async function POST(
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
    const validated = createResultFileSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    if (!isStoredDocumentUrl(validated.data.fileUrl)) {
      return NextResponse.json(
        { error: "Result files must use secure stored document URLs" },
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
      },
    })

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    const studentProfileId = validated.data.studentProfileId?.trim() || null

    if (studentProfileId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          classId: exam.classId,
          studentProfileId,
        },
        select: {
          id: true,
        },
      })

      if (!enrollment) {
        return NextResponse.json(
          { error: "Selected student is not linked to this class" },
          { status: 400 }
        )
      }
    }

    const resultFile = await prisma.resultFile.create({
      data: {
        examId: exam.id,
        studentProfileId,
        fileUrl: validated.data.fileUrl,
        fileType: validated.data.fileType,
        mimeType: validated.data.mimeType,
        uploadedByUserId: session.user.id,
      },
      select: {
        id: true,
      },
    })

    return NextResponse.json({ resultFile }, { status: 201 })
  } catch (error) {
    console.error("Failed to attach result file:", error)
    return NextResponse.json(
      { error: "Failed to attach result file" },
      { status: 500 }
    )
  }
}
