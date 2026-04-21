import { AdminTablePageSkeleton } from "@/components/admin/admin-loading-skeletons"

export default function Loading() {
  return (
    <AdminTablePageSkeleton
      title="Search Students"
      description="Find students by name, email, student ID, or grade level"
    />
  )
}
