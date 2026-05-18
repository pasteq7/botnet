export function getServerSupabaseUrl() {
  return process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
}
