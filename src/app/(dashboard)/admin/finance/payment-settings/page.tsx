import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getAcademyPaymentSettings } from "@/lib/manual-payments-data"
import { PaymentSettingsForm } from "@/components/finance/payment-settings-form"

export const metadata: Metadata = {
  title: "Payment Settings - Admin - AcademyFlow",
}

export default async function AdminPaymentSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const settings = await getAcademyPaymentSettings(session.user.academyId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payment Settings</h2>
        <p className="text-muted-foreground">
          Configure the manual payment instructions parents and students see on
          invoice pages.
        </p>
      </div>

      <PaymentSettingsForm initialSettings={settings} />
    </div>
  )
}
