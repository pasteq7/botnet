import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { hasAdminRole } from "@/lib/auth/admin-role";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
export { hasAdminRole };

export async function requireAdmin(): Promise<
  | { ok: true; supabase: ServerSupabaseClient; user: User }
  | { ok: false; supabase: ServerSupabaseClient; user: User | null }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!hasAdminRole(user)) {
    return { ok: false, supabase, user };
  }

  return { ok: true, supabase, user };
}

export function adminUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
