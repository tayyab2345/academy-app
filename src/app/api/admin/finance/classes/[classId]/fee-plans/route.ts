import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const assignFeePlanSchema = z.object({
  feePlanId: z.string().min(1),
  customAmount: z.number().positive().optional().nullable(),
  effectiveFrom: z.string().or(z.date()),
  effectiveUntil: z.string().optional().nullable(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const classData = await prisma.class.findUnique({
      where: { id: params.classId },
    })

    if (!classData || classData.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    const assignments = await prisma.classFeeAssignment.findMany({
      where: {
        classId: params.classId,
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      include: {
        feePlan: true,
      },
      orderBy: {
        effectiveFrom: "desc",
      },
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error("Failed to fetch class fee plans:", error)
    return NextResponse.json(
      { error: "Failed to fetch fee plans" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = assignFeePlanSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const classData = await prisma.class.findUnique({
      where: { id: params.classId },
    })

    if (!classData || classData.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    const feePlan = await prisma.feePlan.findUnique({
      where: { id: validated.data.feePlanId },
    })

    if (!feePlan || feePlan.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Fee plan not found" }, { status: 404 })
    }

    const assignment = await prisma.classFeeAssignment.create({
      data: {
        classId: params.classId,
        feePlanId: validated.data.feePlanId,
        customAmount: validated.data.customAmount,
        effectiveFrom: new Date(validated.data.effectiveFrom),
        effectiveUntil: validated.data.effectiveUntil
          ? new Date(validated.data.effectiveUntil)
          : null,
      },
      include: {
        feePlan: true,
      },
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error("Failed to assign fee plan:", error)
    return NextResponse.json(
      { error: "Failed to assign fee plan" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const assignmentId = searchParams.get("assignmentId")

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      )
    }

    const assignment = await prisma.classFeeAssignment.findUnique({
      where: { id: assignmentId },
      include: { class: true },
    })

    if (!assignment || assignment.classId !== params.classId) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    if (assignment.class.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await prisma.classFeeAssignment.delete({
      where: { id: assignmentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to remove fee plan assignment:", error)
    return NextResponse.json(
      { error: "Failed to remove assignment" },
      { status: 500 }
    )
  }
}
