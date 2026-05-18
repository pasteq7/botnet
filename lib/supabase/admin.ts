import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseUrl } from "@/lib/supabase/urls";

export function createAdminClient() {
  return createClient(
    getServerSupabaseUrl(),
    process.env.SUPABASE_SECRET_KEY!
  );
}
