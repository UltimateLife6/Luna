export type AdminAccess = "ready" | "anonymous" | "closed";

export function adminAccess(input: { configured: boolean; role: string | null }): AdminAccess {
  if (!input.configured) {
    return "closed";
  }

  if (input.role === "owner" || input.role === "admin") {
    return "ready";
  }

  if (!input.role) {
    return "anonymous";
  }

  return "closed";
}
