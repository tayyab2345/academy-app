import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getManualPaymentSubmissionDetail } from "@/lib/manual-payments-data"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const submission = await getManualPaymentSubmissionDetail(
      session.user.academyId,
      params.submissionId
    )

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    return NextResponse.json({ submission })
  } catch (error) {
    console.error("Failed to fetch submission:", error)
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    )
  }
}
