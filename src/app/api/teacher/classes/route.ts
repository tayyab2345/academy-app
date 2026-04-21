import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import { prisma } from "@/lib/prisma"
import { getTeacherActiveClassOptions } from "@/lib/teacher/teacher-class-data"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const classes = await getTeacherActiveClassOptions(session.user.id)

    if (classes.length === 0) {
      const teacherProfileExists = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      })

      if (!teacherProfileExists) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { classes },
      {
        headers: getPrivateCacheHeaders(30),
      }
    )
  } catch (error) {
    console.error("Failed to fetch teacher classes:", error)
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    )
  }
}
