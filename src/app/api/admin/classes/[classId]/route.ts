import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { syncClassEnrollmentAssignments } from "@/lib/class-enrollment"
import { syncRecurringSessionsForClass } from "@/lib/class-session-schedule"
import { syncPrimaryTeacherAssignment } from "@/lib/class-teacher-assignment"
import { prisma } from "@/lib/prisma"
import { CLASS_WEEKDAY_VALUES } from "@/lib/class-schedule"
import { z } from "zod"

const optionalDateInputSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return null
    }

    return value
  },
  z.string().or(z.date()).nullable()
)

const teacherProfileIdSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined
    }

    return value
  },
  z.string().min(1).optional()
)

const updateClassSchema = z
  .object({
    courseId: z.string().min(1).optional(),
    name: z.string().min(2).optional(),
    section: z.string().optional().nullable(),
    academicYear: z.string().trim().optional(),
    startDate: optionalDateInputSchema.optional(),
    endDate: optionalDateInputSchema.optional(),
    status: z.enum(["active", "completed", "cancelled"]).optional(),
    scheduleDays: z.array(z.enum(CLASS_WEEKDAY_VALUES)).optional(),
    scheduleStartTime: z.string().optional().nullable(),
    scheduleEndTime: z.string().optional().nullable(),
    defaultMeetingPlatform: z
      .enum(["zoom", "google_meet", "teams", "in_person"])
      .optional(),
    defaultMeetingLink: z.string().url().optional().nullable().or(z.literal("")),
    lateThresholdMinutes: z.coerce.number().int().min(0).max(120).optional(),
    studentProfileIds: z.array(z.string()).optional(),
    teacherProfileId: teacherProfileIdSchema,
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)

      if (end.getTime() < start.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be on or after the start date",
          path: ["endDate"],
        })
      }
    }

    const hasScheduleDays = data.scheduleDays !== undefined
    const hasScheduleStartTime = data.scheduleStartTime !== undefined
    const hasScheduleEndTime = data.scheduleEndTime !== undefined

    if (!hasScheduleDays && !hasScheduleStartTime && !hasScheduleEndTime) {
      return
    }

    const scheduleDays = data.scheduleDays || []
    const scheduleStartTime = data.scheduleStartTime || ""
    const scheduleEndTime = data.scheduleEndTime || ""
    const hasAnyScheduleField =
      scheduleDays.length > 0 ||
      Boolean(scheduleStartTime) ||
      Boolean(scheduleEndTime)

    if (!hasAnyScheduleField) {
      return
    }

    if (scheduleDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one class day",
        path: ["scheduleDays"],
      })
    }

    if (!scheduleStartTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start time is required when a schedule is configured",
        path: ["scheduleStartTime"],
      })
    }

    if (!scheduleEndTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time is required when a schedule is configured",
        path: ["scheduleEndTime"],
      })
    }

    if (
      scheduleStartTime &&
      scheduleEndTime &&
      scheduleEndTime <= scheduleStartTime
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be later than the start time",
        path: ["scheduleEndTime"],
      })
    }

    const defaultMeetingPlatform = data.defaultMeetingPlatform ?? "in_person"
    const defaultMeetingLink =
      data.defaultMeetingLink === null ? "" : data.defaultMeetingLink || ""

    if (
      data.defaultMeetingPlatform !== undefined &&
      defaultMeetingPlatform !== "in_person" &&
      !defaultMeetingLink
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meeting link is required for online classes",
        path: ["defaultMeetingLink"],
      })
    }
  })

function mapClassUpdateError(error: unknown) {
  if (!(error instanceof Error)) {
    return null
  }

  if (error.message === "Teacher not found") {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  if (
    error.message === "Only active teachers can be assigned to a class" ||
    error.message ===
      "One or more selected students could not be assigned. Check academy ownership, grade level rules, and active status."
  ) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return null
}

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
      include: {
        course: true,
        sessions: {
          where: {
            endTime: {
              gte: new Date(),
            },
            status: {
              in: ["scheduled", "ongoing"],
            },
          },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            status: true,
            meetingPlatform: true,
            meetingLink: true,
            _count: {
              select: {
                attendances: true,
              },
            },
          },
          orderBy: {
            startTime: "asc",
          },
          take: 3,
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

    if (!classData || classData.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    return NextResponse.json({ class: classData })
  } catch (error) {
    console.error("Failed to fetch class:", error)
    return NextResponse.json(
      { error: "Failed to fetch class" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = updateClassSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const existingClass = await prisma.class.findUnique({
      where: { id: params.classId },
      select: {
        id: true,
        academyId: true,
        courseId: true,
        startDate: true,
        endDate: true,
        defaultMeetingPlatform: true,
        defaultMeetingLink: true,
      },
    })

    if (!existingClass || existingClass.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    if (
      validated.data.courseId &&
      validated.data.courseId !== existingClass.courseId
    ) {
      return NextResponse.json(
        { error: "Course cannot be changed after class creation" },
        { status: 400 }
      )
    }

    const startDate =
      validated.data.startDate === undefined
        ? existingClass.startDate
        : validated.data.startDate
          ? new Date(validated.data.startDate)
          : null
    const endDate =
      validated.data.endDate === undefined
        ? existingClass.endDate
        : validated.data.endDate
          ? new Date(validated.data.endDate)
          : null

    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      return NextResponse.json(
        { error: "End date must be on or after the start date" },
        { status: 400 }
      )
    }

    const resolvedMeetingPlatform =
      validated.data.defaultMeetingPlatform ?? existingClass.defaultMeetingPlatform
    const resolvedMeetingLink =
      validated.data.defaultMeetingLink === undefined
        ? existingClass.defaultMeetingLink
        : validated.data.defaultMeetingLink || null

    if (resolvedMeetingPlatform !== "in_person" && !resolvedMeetingLink) {
      return NextResponse.json(
        { error: "Meeting link is required for online classes" },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.class.update({
        where: { id: params.classId },
        data: {
          name: validated.data.name,
          section:
            validated.data.section === undefined
              ? undefined
              : validated.data.section || null,
          academicYear:
            validated.data.academicYear === undefined
              ? undefined
              : validated.data.academicYear,
          startDate: validated.data.startDate
            ? new Date(validated.data.startDate)
            : validated.data.startDate === null
              ? null
              : undefined,
          endDate: validated.data.endDate
            ? new Date(validated.data.endDate)
            : validated.data.endDate === null
              ? null
              : undefined,
          status: validated.data.status,
          scheduleDays: validated.data.scheduleDays,
          scheduleStartTime:
            validated.data.scheduleStartTime === undefined
              ? undefined
              : validated.data.scheduleStartTime || null,
          scheduleEndTime:
            validated.data.scheduleEndTime === undefined
              ? undefined
              : validated.data.scheduleEndTime || null,
          scheduleRecurrence:
            validated.data.scheduleDays !== undefined ||
            validated.data.scheduleStartTime !== undefined ||
            validated.data.scheduleEndTime !== undefined
              ? "weekly"
              : undefined,
          defaultMeetingPlatform: validated.data.defaultMeetingPlatform,
          defaultMeetingLink:
            validated.data.defaultMeetingLink === undefined
              ? undefined
              : validated.data.defaultMeetingLink || null,
          lateThresholdMinutes: validated.data.lateThresholdMinutes,
        },
      })

      if (validated.data.teacherProfileId) {
        await syncPrimaryTeacherAssignment({
          tx,
          academyId: session.user.academyId,
          classId: params.classId,
          teacherProfileId: validated.data.teacherProfileId,
        })
      }

      if (validated.data.studentProfileIds !== undefined) {
        const classWithCourse = await tx.class.findUnique({
          where: { id: params.classId },
          select: {
            course: {
              select: {
                gradeLevel: true,
              },
            },
          },
        })

        if (!classWithCourse) {
          throw new Error("Class not found")
        }

        await syncClassEnrollmentAssignments({
          tx,
          academyId: session.user.academyId,
          classId: params.classId,
          gradeLevel: classWithCourse.course.gradeLevel,
          studentProfileIds: validated.data.studentProfileIds,
        })
      }
    })

    const classData = await prisma.class.findUniqueOrThrow({
      where: { id: params.classId },
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

    await syncRecurringSessionsForClass(params.classId)

    return NextResponse.json({ class: classData })
  } catch (error) {
    console.error("Failed to update class:", error)

    const mappedError = mapClassUpdateError(error)
    if (mappedError) {
      return mappedError
    }

    return NextResponse.json(
      { error: "Failed to update class" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
      select: {
        id: true,
        academyId: true,
      },
    })

    if (!classData || classData.academyId !== session.user.academyId) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    await prisma.class.delete({
      where: { id: params.classId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete class:", error)
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 }
    )
  }
}
