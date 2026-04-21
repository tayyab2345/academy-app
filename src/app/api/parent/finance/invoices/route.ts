import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status") || ""

    const where: any = {
      studentProfileId: { in: studentIds },
      status: { not: "draft" },
    }

    if (status) {
      where.status = status
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          studentProfile: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
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
          payments: {
            where: { status: "completed" },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.count({ where }),
    ])

    return NextResponse.json({
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Failed to fetch parent invoices:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    )
  }
}
