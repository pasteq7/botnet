import type { User } from "@supabase/supabase-js";

function hasRoleValue(value: unknown): boolean {
  if (value === "admin") return true;
  if (Array.isArray(value)) return value.includes("admin");
  return false;
}

export function hasAdminRole(user: Pick<User, "app_metadata"> | null | undefined): user is User {
  if (!user) return false;

  const appMetadata = user.app_metadata ?? {};
  return (
    hasRoleValue(appMetadata.role) ||
    hasRoleValue(appMetadata.roles) ||
    hasRoleValue(appMetadata.claims)
  );
}
