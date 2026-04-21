import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getManageableExamWhereForUser } from "@/lib/results/result-access"
import { deleteStoredDocumentByUrl } from "@/lib/storage/document-storage"

export async function DELETE(
  _req: Request,
  { params }: { params: { examId: string; fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin" && session.user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
      },
    })

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    const resultFile = await prisma.resultFile.findFirst({
      where: {
        id: params.fileId,
        examId: exam.id,
      },
      select: {
        id: true,
        fileUrl: true,
      },
    })

    if (!resultFile) {
      return NextResponse.json({ error: "Result file not found" }, { status: 404 })
    }

    await prisma.resultFile.delete({
      where: {
        id: resultFile.id,
      },
    })

    await deleteStoredDocumentByUrl(resultFile.fileUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete result file:", error)
    return NextResponse.json(
      { error: "Failed to delete result file" },
      { status: 500 }
    )
  }
}
