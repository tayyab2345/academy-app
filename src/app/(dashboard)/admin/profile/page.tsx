import { Metadata } from "next"
import { redirect } from "next/navigation"
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form"
import { getCurrentUserProfile } from "@/lib/profile-data"

export const metadata: Metadata = {
  title: "Profile Settings - Admin - AcademyFlow",
}

export default async function AdminProfilePage() {
  const user = await getCurrentUserProfile("admin")

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">
          Update your admin profile details and avatar.
        </p>
      </div>

      <ProfileSettingsForm
        title="Admin Profile"
        description="These changes will update your shared admin identity everywhere it appears."
        user={user}
      />
    </div>
  )
}
