import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { TeacherAttendancePageContent } from "@/components/teacher/attendance/teacher-attendance-page-content"
import { getTeacherAttendancePageData } from "@/lib/teacher/teacher-attendance-data"

interface TeacherAttendancePageProps {
  searchParams?: {
    classId?: string
    date?: string
  }
}

export const metadata: Metadata = {
  title: "Attendance - Teacher - AcademyFlow",
  description: "Mark attendance for your classes",
}

export default async function TeacherAttendancePage({
  searchParams,
}: TeacherAttendancePageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login")
  }

  const data = await getTeacherAttendancePageData({
    userId: session.user.id,
    classId: searchParams?.classId,
    dateInput: searchParams?.date,
  })

  if (!data) {
    redirect("/teacher")
  }

  return <TeacherAttendancePageContent {...data} />
}
