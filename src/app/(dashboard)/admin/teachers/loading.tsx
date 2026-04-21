import { AdminTablePageSkeleton } from "@/components/admin/admin-loading-skeletons"

export default function Loading() {
  return (
    <AdminTablePageSkeleton
      title="Search Teachers"
      description="Find teachers by name, email, or employee ID"
    />
  )
}
