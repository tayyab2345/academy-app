import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FeePlanForm } from "@/components/admin/finance/fee-plan-form"

interface EditFeePlanPageProps {
  params: {
    feePlanId: string
  }
}

async function fetchFeePlan(feePlanId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const feePlan = await prisma.feePlan.findUnique({
    where: { id: feePlanId },
  })

  if (!feePlan || feePlan.academyId !== session.user.academyId) {
    return null
  }

  return feePlan
}

export async function generateMetadata({
  params,
}: EditFeePlanPageProps): Promise<Metadata> {
  const feePlan = await fetchFeePlan(params.feePlanId)

  if (!feePlan) {
    return { title: "Fee Plan Not Found" }
  }

  return {
    title: `Edit ${feePlan.name} - Fee Plans - AcademyFlow`,
  }
}

export default async function EditFeePlanPage({
  params,
}: EditFeePlanPageProps) {
  const feePlan = await fetchFeePlan(params.feePlanId)

  if (!feePlan) {
    notFound()
  }

  const initialData = {
    id: feePlan.id,
    name: feePlan.name,
    description: feePlan.description || "",
    amount: Number(feePlan.amount),
    currency: feePlan.currency,
    frequency: feePlan.frequency,
    dueDayOfMonth: feePlan.dueDayOfMonth,
    lateFeeAmount: feePlan.lateFeeAmount ? Number(feePlan.lateFeeAmount) : null,
    lateFeeType: feePlan.lateFeeType,
    isActive: feePlan.isActive,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/finance/fee-plans/${params.feePlanId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Fee Plan</h2>
          <p className="text-muted-foreground">
            Update fee plan details for {feePlan.name}
          </p>
        </div>
      </div>

      <FeePlanForm initialData={initialData} isEditing />
    </div>
  )
}
