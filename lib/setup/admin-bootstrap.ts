import type { User } from "@supabase/supabase-js";
import type { createAdminClient } from "@/lib/supabase/admin";
import { hasAdminRole } from "@/lib/auth/admin-role";

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

export type AdminBootstrapStatus = {
  hasAdmin: boolean;
  requiresSetupToken: boolean;
  setupConfigured: boolean;
  setupAvailable: boolean;
};

export function requiresSetupToken() {
  return process.env.NODE_ENV !== "development";
}

export function getSetupSecret() {
  return process.env.SETUP_SECRET?.trim() ?? "";
}

export function isValidSetupToken(token: unknown) {
  if (!requiresSetupToken()) return true;

  const setupSecret = getSetupSecret();
  return typeof token === "string" && setupSecret.length > 0 && token === setupSecret;
}

export function withAdminMetadata(user: Pick<User, "app_metadata"> | null | undefined) {
  const appMetadata = user?.app_metadata ?? {};
  const roles = Array.isArray(appMetadata.roles) ? appMetadata.roles : [];

  return {
    ...appMetadata,
    role: "admin",
    roles: Array.from(new Set([...roles, "admin"])),
  };
}

export async function findUserByEmail(supabase: AdminSupabaseClient, email: string) {
  const normalizedEmail = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < 1000) return null;

    page += 1;
  }
}

export async function hasExistingAdmin(supabase: AdminSupabaseClient) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    if (data.users.some((user) => hasAdminRole(user))) return true;
    if (data.users.length < 1000) return false;

    page += 1;
  }
}

export async function getAdminBootstrapStatus(supabase: AdminSupabaseClient): Promise<AdminBootstrapStatus> {
  const hasAdmin = await hasExistingAdmin(supabase);
  const tokenRequired = requiresSetupToken();
  const setupConfigured = !tokenRequired || getSetupSecret().length > 0;

  return {
    hasAdmin,
    requiresSetupToken: tokenRequired,
    setupConfigured,
    setupAvailable: setupConfigured && !hasAdmin,
  };
}
