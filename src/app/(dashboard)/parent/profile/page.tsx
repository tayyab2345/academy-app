import { Metadata } from "next"
import { redirect } from "next/navigation"
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form"
import { getCurrentUserProfile } from "@/lib/profile-data"

export const metadata: Metadata = {
  title: "Profile Settings - Parent - AcademyFlow",
}

export default async function ParentProfilePage() {
  const user = await getCurrentUserProfile("parent")

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">
          Update your parent profile details and avatar.
        </p>
      </div>

      <ProfileSettingsForm
        title="Parent Profile"
        description="Your updated photo and details will appear anywhere your parent account is referenced."
        user={user}
      />
    </div>
  )
}
