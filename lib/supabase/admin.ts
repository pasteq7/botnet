import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseUrl } from "@/lib/supabase/urls";

type AdminClientOptions = NonNullable<Parameters<typeof createClient>[2]>;

export function createAdminClient(options: AdminClientOptions = {}) {
  return createClient(
    getServerSupabaseUrl(),
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false },
      ...options,
    }
  );
}

export function createNoStoreAdminClient() {
  return createAdminClient({
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
}
