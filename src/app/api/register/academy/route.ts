import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const registerSchema = z.object({
  academyName: z.string().min(2),
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
  contactEmail: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate input
    const validatedData = registerSchema.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: validatedData.error.errors },
        { status: 400 }
      )
    }

    const {
      academyName,
      subdomain,
      contactEmail,
      firstName,
      lastName,
      email,
      password,
    } = validatedData.data

    // Check if subdomain is already taken
    const existingAcademy = await prisma.academy.findUnique({
      where: { subdomain },
    })

    if (existingAcademy) {
      return NextResponse.json(
        { error: "This subdomain is already taken" },
        { status: 400 }
      )
    }

    // Check if email is already used in this academy context
    // (We'll check globally for simplicity, but in production you might want per-academy uniqueness)
    const existingUser = await prisma.user.findFirst({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create academy and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create academy
      const academy = await tx.academy.create({
        data: {
          name: academyName,
          subdomain,
          contactEmail,
        },
      })

      // Create admin user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: "admin",
          isAcademyOwner: true,
          academyId: academy.id,
        },
      })

      return { academy, user }
    })

    return NextResponse.json(
      {
        success: true,
        message: "Academy created successfully",
        academy: {
          id: result.academy.id,
          name: result.academy.name,
          subdomain: result.academy.subdomain,
        },
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Registration error:", error)

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
