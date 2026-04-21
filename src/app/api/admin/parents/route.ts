import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { getAdminParentsPageData } from "@/lib/admin/admin-lists-data"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const createParentSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  occupation: z.string().optional(),
  preferredContactMethod: z.enum(["email", "phone", "sms"]).default("email"),
  isPrimaryContact: z.boolean().default(false),
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

    const data = await getAdminParentsPageData({
      academyId: session.user.academyId,
      page,
      limit,
      search,
    })

    return NextResponse.json(data, {
      headers: getPrivateCacheHeaders(30),
    })
  } catch (error) {
    console.error("Failed to fetch parents:", error)
    return NextResponse.json(
      { error: "Failed to fetch parents" },
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
    const validated = createParentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const { password, ...userData } = validated.data

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

    const passwordHash = await bcrypt.hash(password, 10)

    const parent = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: userData.email,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          role: "parent",
          academyId: session.user.academyId,
        },
      })

      const profile = await tx.parentProfile.create({
        data: {
          userId: user.id,
          occupation: userData.occupation,
          preferredContactMethod: userData.preferredContactMethod,
          isPrimaryContact: userData.isPrimaryContact,
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

    return NextResponse.json({ parent }, { status: 201 })
  } catch (error) {
    console.error("Failed to create parent:", error)
    return NextResponse.json(
      { error: "Failed to create parent" },
      { status: 500 }
    )
  }
}
