import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const enrollStudentsSchema = z.object({
  studentIds: z.array(z.string()).min(1, "Select at least one student"),
})

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
    const validated = enrollStudentsSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const classData = await prisma.class.findUnique({
      where: { id: params.classId },
      include: {
        course: {
          select: {
            gradeLevel: true,
          },
        },
      },
    })

    if (!classData || classData.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    const students = await prisma.studentProfile.findMany({
      where: {
        id: { in: validated.data.studentIds },
        gradeLevel: classData.course.gradeLevel,
        user: {
          academyId: session.user.academyId,
          role: "student",
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (students.length !== validated.data.studentIds.length) {
      return NextResponse.json(
        {
          error:
            "One or more students could not be enrolled. Check academy ownership and grade level.",
        },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      for (const studentId of validated.data.studentIds) {
        const existingEnrollment = await tx.enrollment.findUnique({
          where: {
            studentProfileId_classId: {
              studentProfileId: studentId,
              classId: params.classId,
            },
          },
        })

        if (existingEnrollment) {
          await tx.enrollment.update({
            where: {
              studentProfileId_classId: {
                studentProfileId: studentId,
                classId: params.classId,
              },
            },
            data: {
              status: "active",
            },
          })
        } else {
          await tx.enrollment.create({
            data: {
              classId: params.classId,
              studentProfileId: studentId,
              status: "active",
            },
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      enrolledCount: validated.data.studentIds.length,
    })
  } catch (error) {
    console.error("Failed to enroll students:", error)
    return NextResponse.json(
      { error: "Failed to enroll students" },
      { status: 500 }
    )
  }
}
