import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { notifyManualPaymentRejected } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

const rejectSchema = z.object({
  rejectionReason: z.string().trim().min(1, "Rejection reason is required"),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = rejectSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      )
    }

    const submission = await prisma.manualPaymentSubmission.findFirst({
      where: {
        id: params.submissionId,
        academyId: session.user.academyId,
      },
      select: {
        id: true,
        status: true,
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    if (submission.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending submissions can be rejected" },
        { status: 400 }
      )
    }

    const updatedSubmission = await prisma.manualPaymentSubmission.update({
      where: { id: submission.id },
      data: {
        status: "rejected",
        rejectionReason: validated.data.rejectionReason,
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
      },
    })

    try {
      await notifyManualPaymentRejected(updatedSubmission.id)
    } catch (notificationError) {
      console.error("Failed to send manual payment rejection notifications:", notificationError)
    }

    return NextResponse.json({ submission: updatedSubmission })
  } catch (error) {
    console.error("Failed to reject submission:", error)
    return NextResponse.json(
      { error: "Failed to reject submission" },
      { status: 500 }
    )
  }
}
