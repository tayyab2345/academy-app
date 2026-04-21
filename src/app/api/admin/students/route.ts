import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getAdminStudentsPageData,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const createStudentSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  studentId: z.string().min(1, "Student ID is required"),
  dateOfBirth: z.string().or(z.date()),
  gradeLevel: z.string().min(1, "Grade level is required"),
  enrollmentDate: z.string().or(z.date()).optional(),
  medicalNotes: z.string().optional(),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(1, "Emergency contact phone is required"),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = parsePositiveInt(searchParams.get("page") || undefined, 1)
    const limit = parsePositiveInt(
      searchParams.get("limit") || undefined,
      DEFAULT_PAGE_SIZE,
      100
    )
    const search = searchParams.get("search") || ""
    const gradeLevel = searchParams.get("gradeLevel") || ""

    const data = await getAdminStudentsPageData({
      academyId: session.user.academyId,
      page,
      limit,
      search,
      gradeLevel,
    })

    return NextResponse.json(data, {
      headers: getPrivateCacheHeaders(30),
    })
  } catch (error) {
    console.error("Failed to fetch students:", error)
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = createStudentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const { password, studentId, ...userData } = validated.data

    const existingUser = await prisma.user.findFirst({
      where: {
        email: userData.email,
        academyId: session.user.academyId,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists in this academy" },
        { status: 400 }
      )
    }

    const existingStudent = await prisma.studentProfile.findFirst({
      where: { studentId },
    })

    if (existingStudent) {
      return NextResponse.json(
        { error: "Student ID already exists" },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: userData.email,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          role: "student",
          academyId: session.user.academyId,
        },
      })

      const profile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          studentId,
          dateOfBirth: new Date(userData.dateOfBirth),
          gradeLevel: userData.gradeLevel,
          enrollmentDate: userData.enrollmentDate
            ? new Date(userData.enrollmentDate)
            : new Date(),
          medicalNotes: userData.medicalNotes,
          emergencyContactName: userData.emergencyContactName,
          emergencyContactPhone: userData.emergencyContactPhone,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              isActive: true,
            },
          },
        },
      })

      return profile
    })

    return NextResponse.json({ student }, { status: 201 })
  } catch (error) {
    console.error("Failed to create student:", error)
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 }
    )
  }
}
