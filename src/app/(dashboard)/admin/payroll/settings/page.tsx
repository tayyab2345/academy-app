import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import {
  getCompensationProfiles,
  getPayrollStaffOptions,
} from "@/lib/payroll/payroll-data"
import { getOrCreateAcademyPayrollSettings } from "@/lib/payroll/payroll-adjustments"
import { PayrollRulesForm } from "@/components/payroll/payroll-rules-form"
import { SalaryProfileForm } from "@/components/payroll/salary-profile-form"
import { SalaryProfilesTable } from "@/components/payroll/salary-profiles-table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Payroll Settings - Admin - AcademyFlow",
  description: "Configure salary profiles for teachers and admin staff",
}

interface AdminPayrollSettingsPageProps {
  searchParams?: {
    userId?: string | string[]
    role?: string | string[]
  }
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminPayrollSettingsPage({
  searchParams,
}: AdminPayrollSettingsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const selectedUserId = getSingleSearchParam(searchParams?.userId) || ""
  const role = getSingleSearchParam(searchParams?.role)

  const [staffOptions, profiles, settings] = await Promise.all([
    getPayrollStaffOptions(
      session.user.academyId,
      selectedUserId ? [selectedUserId] : []
    ),
    getCompensationProfiles({
      academyId: session.user.academyId,
      role: role === "teacher" || role === "admin" ? role : undefined,
      userId: selectedUserId || undefined,
    }),
    getOrCreateAcademyPayrollSettings(session.user.academyId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payroll Settings</h2>
          <p className="text-muted-foreground">
            Set salary profiles that drive monthly payroll generation.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/payroll">
            <Button variant="outline">Payroll Records</Button>
          </Link>
          <Link href="/admin/finance">
            <Button variant="outline">Finance Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <SalaryProfileForm
          staffOptions={staffOptions}
          initialUserId={selectedUserId || undefined}
        />

        <Card>
          <CardHeader>
            <CardTitle>How Salary Profiles Work</CardTitle>
            <CardDescription>
              Salary profiles define the default monthly amount for each eligible employee.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Teachers and admin staff are supported through the same structure so payroll remains consistent across the academy.
            </p>
            <p>
              Inactive profiles stay available in payroll history but are not used for new salary records.
            </p>
            <p>
              You can still adjust a specific payroll amount later without changing the employee&apos;s default monthly salary.
            </p>
          </CardContent>
        </Card>
      </div>

      <PayrollRulesForm settings={settings} />

      <Card>
        <CardHeader>
          <CardTitle>Configured Salary Profiles</CardTitle>
          <CardDescription>
            Review salary settings and jump back into a specific employee profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SalaryProfilesTable profiles={profiles} />
        </CardContent>
      </Card>
    </div>
  )
}
