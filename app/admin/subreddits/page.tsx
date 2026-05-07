import { createClient } from "@/lib/supabase/server";
import SubredditListClient from "./SubredditListClient";

export default async function SubredditsAdminPage() {
  const supabase = await createClient();

  const [
    { data: subreddits, error: subError },
    { count: totalPersonas, error: personaError }
  ] = await Promise.all([
    supabase.from("subreddits").select("*").order("name"),
    supabase.from("personas").select("*", { count: "exact", head: true })
  ]);

  if (subError || personaError) {
    console.error("Error fetching subreddits data:", { subError, personaError });
  }

  return (
    <SubredditListClient 
      initialSubreddits={subreddits || []} 
      totalPersonas={totalPersonas ?? 0} 
    />
  );
}
