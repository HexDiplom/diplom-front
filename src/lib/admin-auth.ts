export function getUserRole(user: unknown): string | null {
  if (!user || typeof user !== "object") {
    return null
  }

  const role = (user as { role?: unknown }).role

  if (typeof role === "string") {
    return role
  }

  if (Array.isArray(role)) {
    return role.filter((item) => typeof item === "string").join(",")
  }

  return null
}

export function isAdminUser(user: unknown): boolean {
  return getUserRole(user)?.toLowerCase().includes("admin") ?? false
}
