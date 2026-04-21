import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!parentProfile) {
      return NextResponse.json(
        { error: "Parent profile not found" },
        { status: 403 }
      )
    }

    const links = await prisma.parentStudentLink.findMany({
      where: { parentProfileId: parentProfile.id },
      select: { studentProfileId: true },
    })

    const studentIds = links.map((link) => link.studentProfileId)

    const report = await prisma.report.findFirst({
      where: {
        id: params.reportId,
        studentProfileId: { in: studentIds },
        status: "published",
      },
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

    return NextResponse.json({ report })
  } catch (error) {
    console.error("Failed to fetch report:", error)
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    )
  }
}
