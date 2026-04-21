import { AdminTablePageSkeleton } from "@/components/admin/admin-loading-skeletons"

export default function Loading() {
  return (
    <AdminTablePageSkeleton
      title="Filter Reports"
      description="Search and filter through all academy reports"
      showSummaryCards
    />
  )
}
