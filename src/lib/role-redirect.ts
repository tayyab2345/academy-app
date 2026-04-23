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
