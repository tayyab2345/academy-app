import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  DEFAULT_PAGE_SIZE,
  parsePositiveInt,
} from "@/lib/admin/admin-data"
import { getAdminClassesPageData } from "@/lib/admin/admin-lists-data"
import { syncClassEnrollmentAssignments } from "@/lib/class-enrollment"
import { syncRecurringSessionsForClass } from "@/lib/class-session-schedule"
import { syncPrimaryTeacherAssignment } from "@/lib/class-teacher-assignment"
import { getPrivateCacheHeaders } from "@/lib/http-cache"
import { prisma } from "@/lib/prisma"
import { CLASS_WEEKDAY_VALUES } from "@/lib/class-schedule"
import { z } from "zod"

const teacherProfileIdSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined
    }

    return value
  },
  z.string().min(1).optional()
)

const createClassSchema = z
  .object({
    courseId: z.string().min(1, "Course is required"),
    name: z.string().min(2, "Class name must be at least 2 characters"),
    section: z.string().optional(),
    academicYear: z.string().min(1, "Academic year is required"),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
    scheduleDays: z.array(z.enum(CLASS_WEEKDAY_VALUES)).default([]),
    scheduleStartTime: z.string().optional(),
    scheduleEndTime: z.string().optional(),
    defaultMeetingPlatform: z
      .enum(["zoom", "google_meet", "teams", "in_person"])
      .default("in_person"),
    defaultMeetingLink: z.string().url().optional().or(z.literal("")),
    lateThresholdMinutes: z.coerce.number().int().min(0).max(120).default(5),
    studentProfileIds: z.array(z.string()).default([]),
    teacherProfileId: teacherProfileIdSchema,
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endDate).getTime() < new Date(data.startDate).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after the start date",
        path: ["endDate"],
      })
    }

    const hasAnyScheduleField =
      data.scheduleDays.length > 0 ||
      Boolean(data.scheduleStartTime) ||
      Boolean(data.scheduleEndTime)

    if (!hasAnyScheduleField) {
      return
    }

    if (data.scheduleDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one class day",
        path: ["scheduleDays"],
      })
    }

    if (!data.scheduleStartTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start time is required when a schedule is configured",
        path: ["scheduleStartTime"],
      })
    }

    if (!data.scheduleEndTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time is required when a schedule is configured",
        path: ["scheduleEndTime"],
      })
    }

    if (
      data.scheduleStartTime &&
      data.scheduleEndTime &&
      data.scheduleEndTime <= data.scheduleStartTime
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be later than the start time",
        path: ["scheduleEndTime"],
      })
    }

    if (
      data.defaultMeetingPlatform !== "in_person" &&
      !data.defaultMeetingLink
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meeting link is required for online classes",
        path: ["defaultMeetingLink"],
      })
    }
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
    const status = searchParams.get("status") || ""

    const data = await getAdminClassesPageData({
      academyId: session.user.academyId,
      page,
      limit,
      search,
      status,
    })

    return NextResponse.json(data, {
      headers: getPrivateCacheHeaders(30),
    })
  } catch (error) {
    console.error("Failed to fetch classes:", error)
    return NextResponse.json(
      { error: "Failed to fetch classes" },
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
    const validated = createClassSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const course = await prisma.course.findUnique({
      where: { id: validated.data.courseId },
    })

    if (!course || course.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const createdClassId = await prisma.$transaction(async (tx) => {
      const createdClass = await tx.class.create({
        data: {
          academyId: session.user.academyId,
          courseId: validated.data.courseId,
          name: validated.data.name,
          section: validated.data.section || null,
          academicYear: validated.data.academicYear,
          startDate: new Date(validated.data.startDate),
          endDate: new Date(validated.data.endDate),
          scheduleDays: validated.data.scheduleDays,
          scheduleStartTime: validated.data.scheduleStartTime || null,
          scheduleEndTime: validated.data.scheduleEndTime || null,
          scheduleRecurrence: "weekly",
          defaultMeetingPlatform: validated.data.defaultMeetingPlatform,
          defaultMeetingLink: validated.data.defaultMeetingLink || null,
          lateThresholdMinutes: validated.data.lateThresholdMinutes,
        },
      })

      if (validated.data.teacherProfileId) {
        await syncPrimaryTeacherAssignment({
          tx,
          academyId: session.user.academyId,
          classId: createdClass.id,
          teacherProfileId: validated.data.teacherProfileId,
        })
      }

      await syncClassEnrollmentAssignments({
        tx,
        academyId: session.user.academyId,
        classId: createdClass.id,
        gradeLevel: course.gradeLevel,
        studentProfileIds: validated.data.studentProfileIds,
      })

      return createdClass.id
    })

    const classData = await prisma.class.findUniqueOrThrow({
      where: { id: createdClassId },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            subjectArea: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: "active" },
            },
            teachers: true,
          },
        },
      },
    })

    await syncRecurringSessionsForClass(createdClassId)

    return NextResponse.json({ class: classData }, { status: 201 })
  } catch (error) {
    console.error("Failed to create class:", error)

    if (
      error instanceof Error &&
      (error.message === "Teacher not found" ||
        error.message === "Only active teachers can be assigned to a class" ||
        error.message ===
          "One or more selected students could not be assigned. Check academy ownership, grade level, and active status.")
    ) {
      return NextResponse.json(
        { error: error.message },
        {
          status:
            error.message === "Teacher not found"
              ? 404
              : 400,
        }
      )
    }

    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    )
  }
}
