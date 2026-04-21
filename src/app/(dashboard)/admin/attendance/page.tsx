import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getAdminAttendancePageData } from "@/lib/attendance/attendance-portal-data"
import { AdminAttendancePageContent } from "@/components/admin/attendance/admin-attendance-page-content"

interface AdminAttendancePageProps {
  searchParams?: {
    classId?: string
    date?: string
  }
}

export const metadata: Metadata = {
  title: "Attendance - Admin - AcademyFlow",
  description: "Review academy attendance by class and date",
}

export default async function AdminAttendancePage({
  searchParams,
}: AdminAttendancePageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const data = await getAdminAttendancePageData({
    academyId: session.user.academyId,
    classId: searchParams?.classId,
    dateInput: searchParams?.date,
  })

  return <AdminAttendancePageContent {...data} />
}
