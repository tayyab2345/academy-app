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
import {
  createOrLinkSupabasePasswordUser,
  deleteSupabaseAuthUser,
  normalizeAuthEmail,
  updateSupabasePasswordUser,
} from "@/lib/supabase-auth"
import { z } from "zod"

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
    const email = normalizeAuthEmail(userData.email)

    // Check if email already exists in the app.
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
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

    let authUser: Awaited<ReturnType<typeof createOrLinkSupabasePasswordUser>>

    try {
      authUser = await createOrLinkSupabasePasswordUser({
        email,
        password,
        role: "teacher",
        academyId: session.user.academyId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
      })

      if (!authUser.created) {
        await updateSupabasePasswordUser(authUser.user.id, {
          email,
          password,
          role: "teacher",
          academyId: session.user.academyId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
        })
      }
    } catch (error) {
      console.error("[admin/teachers][create][supabase-auth] failed", {
        email,
        error,
      })
      return NextResponse.json(
        {
          error:
            "Could not create the teacher login account. Please check Supabase Auth configuration.",
        },
        { status: 502 }
      )
    }

    const existingAuthLinkedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: authUser.user.id },
          { supabaseAuthUserId: authUser.user.id },
        ],
      },
    })

    if (existingAuthLinkedUser) {
      return NextResponse.json(
        { error: "This Supabase Auth user is already linked to an app user" },
        { status: 400 }
      )
    }

    let teacher

    try {
      teacher = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: authUser.user.id,
            email,
            passwordHash: null,
            supabaseAuthUserId: authUser.user.id,
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
    } catch (error) {
      if (authUser.created) {
        try {
          await deleteSupabaseAuthUser(authUser.user.id)
        } catch (cleanupError) {
          console.error("[admin/teachers][create][supabase-auth-cleanup] failed", {
            authUserId: authUser.user.id,
            cleanupError,
          })
        }
      }

      throw error
    }

    return NextResponse.json({ teacher }, { status: 201 })
  } catch (error) {
    console.error("Failed to create teacher:", error)
    return NextResponse.json(
      { error: "Failed to create teacher" },
      { status: 500 }
    )
  }
}
