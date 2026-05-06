export type DashboardRole = "admin" | "teacher" | "student" | "parent"

const dashboardRoles = new Set<DashboardRole>([
  "admin",
  "teacher",
  "student",
  "parent",
])

export function isDashboardRole(role: unknown): role is DashboardRole {
  return typeof role === "string" && dashboardRoles.has(role as DashboardRole)
}

export function hasUsableDashboardIdentity(
  user:
    | {
        id?: unknown
        role?: unknown
        academyId?: unknown
      }
    | null
    | undefined
): user is { id: string; role: DashboardRole; academyId: string } {
  return (
    typeof user?.id === "string" &&
    user.id.trim().length > 0 &&
    isDashboardRole(user.role) &&
    typeof user.academyId === "string" &&
    user.academyId.trim().length > 0
  )
}

export function getRoleRedirectPath(role: string | undefined | null) {
  switch (role) {
    case "admin":
      return "/admin"
    case "teacher":
      return "/teacher"
    case "student":
      return "/student"
    case "parent":
      return "/parent"
    default:
      return "/"
  }
}
