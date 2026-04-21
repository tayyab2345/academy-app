import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: params.studentId },
      include: { user: true },
    })

    if (!student || student.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const links = await prisma.parentStudentLink.findMany({
      where: {
        studentProfileId: params.studentId,
      },
      include: {
        parentProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        isPrimaryForStudent: "desc",
      },
    })

    return NextResponse.json({ links })
  } catch (error) {
    console.error("Failed to fetch student parents:", error)
    return NextResponse.json(
      { error: "Failed to fetch parents" },
      { status: 500 }
    )
  }
}
