import { Metadata } from "next"
import { redirect } from "next/navigation"
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form"
import { getCurrentUserProfile } from "@/lib/profile-data"

export const metadata: Metadata = {
  title: "Profile Settings - Student - AcademyFlow",
}

export default async function StudentProfilePage() {
  const user = await getCurrentUserProfile("student")

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">
          Update your student profile details and avatar.
        </p>
      </div>

      <ProfileSettingsForm
        title="Student Profile"
        description="Your updated photo and contact details will appear anywhere your student identity is shown."
        user={user}
      />
    </div>
  )
}
