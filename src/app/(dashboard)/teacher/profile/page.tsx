import { Metadata } from "next"
import { redirect } from "next/navigation"
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form"
import { getCurrentUserProfile } from "@/lib/profile-data"

export const metadata: Metadata = {
  title: "Profile Settings - Teacher - AcademyFlow",
}

export default async function TeacherProfilePage() {
  const user = await getCurrentUserProfile("teacher")

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">
          Update your teaching profile details and avatar.
        </p>
      </div>

      <ProfileSettingsForm
        title="Teacher Profile"
        description="Your updated photo and name will appear throughout classes, reports, attendance, and announcements."
        user={user}
      />
    </div>
  )
}
