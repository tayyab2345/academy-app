import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getAdminTeachersPageData,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const createTeacherSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  employeeId: z.string().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  bio: z.string().optional(),
  maxWeeklyHours: z.number().min(1).max(40).optional(),
  phone: z.string().optional(),
})

const updateTeacherSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  employeeId: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  maxWeeklyHours: z.number().min(1).max(40).optional().nullable(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
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

    const data = await getAdminTeachersPageData({
      academyId: session.user.academyId,
      page,
      limit,
      search,
    })

    return NextResponse.json(data, {
      headers: getPrivateCacheHeaders(30),
    })
  } catch (error) {
    console.error("Failed to fetch teachers:", error)
    return NextResponse.json(
      { error: "Failed to fetch teachers" },
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
    const validated = createTeacherSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const { password, employeeId, ...userData } = validated.data

    // Check if email already exists in academy
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

    // Check if employee ID is unique if provided
    if (employeeId) {
      const existingEmployee = await prisma.teacherProfile.findFirst({
        where: { employeeId },
      })

      if (existingEmployee) {
        return NextResponse.json(
          { error: "Employee ID already exists" },
          { status: 400 }
        )
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: userData.email,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          role: "teacher",
          academyId: session.user.academyId,
        },
      })

      const profile = await tx.teacherProfile.create({
        data: {
          userId: user.id,
          employeeId,
          qualification: userData.qualification,
          specialization: userData.specialization,
          bio: userData.bio,
          maxWeeklyHours: userData.maxWeeklyHours,
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

    return NextResponse.json({ teacher }, { status: 201 })
  } catch (error) {
    console.error("Failed to create teacher:", error)
    return NextResponse.json(
      { error: "Failed to create teacher" },
      { status: 500 }
    )
  }
}
