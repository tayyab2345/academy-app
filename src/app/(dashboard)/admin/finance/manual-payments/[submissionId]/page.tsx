import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { calculateOutstandingAmount } from "@/lib/invoice-utils"
import { getManualPaymentSubmissionDetail } from "@/lib/manual-payments-data"
import { Button } from "@/components/ui/button"
import { ManualPaymentSummaryCard } from "@/components/finance/manual-payment-summary-card"
import { ManualPaymentDetail } from "@/components/finance/manual-payment-detail"

interface ManualPaymentDetailPageProps {
  params: {
    submissionId: string
  }
}

async function fetchSubmission(submissionId: string, academyId: string) {
  return getManualPaymentSubmissionDetail(academyId, submissionId)
}

export async function generateMetadata({
  params,
}: ManualPaymentDetailPageProps): Promise<Metadata> {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return { title: "Manual Payment - AcademyFlow" }
  }

  const submission = await fetchSubmission(params.submissionId, session.user.academyId)

  if (!submission) {
    return { title: "Submission Not Found - AcademyFlow" }
  }

  return {
    title: `${submission.invoice.invoiceNumber} - Manual Payment - AcademyFlow`,
  }
}

export default async function AdminManualPaymentDetailPage({
  params,
}: ManualPaymentDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const submission = await fetchSubmission(params.submissionId, session.user.academyId)

  if (!submission) {
    notFound()
  }

  const paidAmount = submission.invoice.payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  )
  const outstandingAmount = calculateOutstandingAmount(
    Number(submission.invoice.totalAmount),
    paidAmount,
    submission.invoice.adjustments.map((adjustment) => ({
      type: adjustment.type,
      amount: Number(adjustment.amount),
    }))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/finance/manual-payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manual Payment Review</h2>
          <p className="text-muted-foreground">
            Review the proof, validate the amount, and record the payment if it
            checks out.
          </p>
        </div>
      </div>

      <ManualPaymentSummaryCard
        submission={{
          id: submission.id,
          amount: Number(submission.amount),
          paymentMethod: submission.paymentMethod,
          transactionId: submission.transactionId,
          paymentDate: submission.paymentDate.toISOString(),
          status: submission.status,
          rejectionReason: submission.rejectionReason,
          reviewedAt: submission.reviewedAt?.toISOString() || null,
          createdAt: submission.createdAt.toISOString(),
          invoice: {
            id: submission.invoice.id,
            invoiceNumber: submission.invoice.invoiceNumber,
            currency: submission.invoice.currency,
            studentProfile: {
              studentId: submission.invoice.studentProfile.studentId,
              user: {
                firstName: submission.invoice.studentProfile.user.firstName,
                lastName: submission.invoice.studentProfile.user.lastName,
              },
            },
          },
          submittedBy: {
            firstName: submission.submittedBy.firstName,
            lastName: submission.submittedBy.lastName,
            role: submission.submittedBy.role,
          },
          reviewedBy: submission.reviewedBy
            ? {
                firstName: submission.reviewedBy.firstName,
                lastName: submission.reviewedBy.lastName,
              }
            : null,
        }}
      />

      <ManualPaymentDetail
        submission={{
          id: submission.id,
          status: submission.status,
          rejectionReason: submission.rejectionReason,
          amount: Number(submission.amount),
          currency: submission.invoice.currency,
          paymentMethod: submission.paymentMethod,
          transactionId: submission.transactionId,
          paymentDate: submission.paymentDate.toISOString(),
          note: submission.note,
          receiptUrl: submission.receiptUrl,
          createdAt: submission.createdAt.toISOString(),
          reviewedAt: submission.reviewedAt?.toISOString() || null,
          submittedBy: {
            name: `${submission.submittedBy.firstName} ${submission.submittedBy.lastName}`,
            role: submission.submittedBy.role,
            email: submission.submittedBy.email,
          },
          reviewedBy: submission.reviewedBy
            ? {
                name: `${submission.reviewedBy.firstName} ${submission.reviewedBy.lastName}`,
              }
            : null,
          invoice: {
            id: submission.invoice.id,
            invoiceNumber: submission.invoice.invoiceNumber,
            description: submission.invoice.description,
            status: submission.invoice.status,
            classLabel: submission.invoice.class
              ? `${submission.invoice.class.course.code} - ${submission.invoice.class.name}`
              : null,
            studentName: `${submission.invoice.studentProfile.user.firstName} ${submission.invoice.studentProfile.user.lastName}`,
            studentId: submission.invoice.studentProfile.studentId,
            studentEmail: submission.invoice.studentProfile.user.email,
            parentContacts: submission.invoice.studentProfile.parentLinks.map((link) => ({
              name: `${link.parentProfile.user.firstName} ${link.parentProfile.user.lastName}`,
              email: link.parentProfile.user.email,
            })),
            totalAmount: Number(submission.invoice.totalAmount),
            paidAmount,
            outstandingAmount,
            payments: submission.invoice.payments.map((payment) => ({
              id: payment.id,
              amount: Number(payment.amount),
              currency: payment.currency,
              status: payment.status,
              paymentMethod: payment.paymentMethod,
              paymentDate: payment.paymentDate.toISOString(),
            })),
          },
        }}
      />
    </div>
  )
}
