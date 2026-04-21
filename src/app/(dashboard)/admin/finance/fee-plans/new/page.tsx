import { Metadata } from "next"
import { FeePlanForm } from "@/components/admin/finance/fee-plan-form"

export const metadata: Metadata = {
  title: "Create Fee Plan - Finance - AcademyFlow",
  description: "Create a new fee plan",
}

export default function NewFeePlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Fee Plan</h2>
        <p className="text-muted-foreground">
          Create a new fee structure for billing
        </p>
      </div>

      <FeePlanForm />
    </div>
  )
}
