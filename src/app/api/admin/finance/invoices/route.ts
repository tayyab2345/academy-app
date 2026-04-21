import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  getAdminInvoicesPageData,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import { prisma } from "@/lib/prisma"
import { generateInvoiceNumber } from "@/lib/invoice-utils"
import { isValidCurrency } from "@/lib/currency-utils"

const createInvoiceSchema = z.object({
  studentProfileId: z.string().min(1, "Student is required"),
  classId: z.string().optional().nullable(),
  feePlanId: z.string().optional().nullable(),
  invoiceCategory: z.enum([
    "tuition",
    "registration",
    "material",
    "transport",
    "activity",
    "other",
  ]),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  taxAmount: z.number().min(0).default(0),
  currency: z.string().refine(isValidCurrency, "Invalid currency"),
  dueDate: z.string().or(z.date()),
  notes: z.string().optional(),
})

export const dynamic = "force-dynamic"

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
    const status = searchParams.get("status") || ""
    const currency = searchParams.get("currency") || ""
    const studentId = searchParams.get("studentId") || ""
    const classId = searchParams.get("classId") || ""

    const data = await getAdminInvoicesPageData({
      academyId: session.user.academyId,
      page,
      limit,
      search,
      status,
      currency,
      studentId,
      classId,
    })

    return NextResponse.json(data, {
      headers: getPrivateCacheHeaders(30),
    })
  } catch (error) {
    console.error("Failed to fetch invoices:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
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
    const validated = createInvoiceSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: validated.data.studentProfileId },
      include: { user: true },
    })

    if (!student || student.user.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    if (validated.data.classId) {
      const classData = await prisma.class.findUnique({
        where: { id: validated.data.classId },
      })

      if (!classData || classData.academyId !== session.user.academyId) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 })
      }
    }

    if (validated.data.feePlanId) {
      const feePlan = await prisma.feePlan.findUnique({
        where: { id: validated.data.feePlanId },
      })

      if (!feePlan || feePlan.academyId !== session.user.academyId) {
        return NextResponse.json({ error: "Fee plan not found" }, { status: 404 })
      }
    }

    let invoiceNumber = generateInvoiceNumber("INV")
    let existingInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      select: { id: true },
    })
    let attempts = 0

    while (existingInvoice && attempts < 5) {
      invoiceNumber = generateInvoiceNumber("INV")
      existingInvoice = await prisma.invoice.findUnique({
        where: { invoiceNumber },
        select: { id: true },
      })
      attempts++
    }

    if (existingInvoice) {
      return NextResponse.json(
        { error: "Failed to generate a unique invoice number" },
        { status: 500 }
      )
    }

    const totalAmount = validated.data.amount + validated.data.taxAmount

    const invoice = await prisma.invoice.create({
      data: {
        studentProfileId: validated.data.studentProfileId,
        classId: validated.data.classId || null,
        feePlanId: validated.data.feePlanId || null,
        invoiceCategory: validated.data.invoiceCategory,
        invoiceNumber,
        description: validated.data.description,
        amount: validated.data.amount,
        taxAmount: validated.data.taxAmount,
        totalAmount,
        currency: validated.data.currency,
        dueDate: new Date(validated.data.dueDate),
        notes: validated.data.notes || null,
        status: "draft",
        createdByUserId: session.user.id,
      },
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
      },
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error("Failed to create invoice:", error)
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    )
  }
}
