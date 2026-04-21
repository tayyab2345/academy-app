export function getUserInitials(
  firstName?: string | null,
  lastName?: string | null
) {
  const first = firstName?.trim().charAt(0) || ""
  const last = lastName?.trim().charAt(0) || ""
  return `${first}${last}`.toUpperCase()
}

export function getFullName(
  firstName?: string | null,
  lastName?: string | null
) {
  return [firstName, lastName].filter(Boolean).join(" ").trim()
}
