import { createClient } from "@/lib/supabase/server";
import CommunityListClient from "./CommunityListClient";

export default async function CommunitiesAdminPage() {
  const supabase = await createClient();

  const [
    { data: communities, error: subError },
    { count: totalPersonas, error: personaError }
  ] = await Promise.all([
    supabase.from("communities").select("*").order("name"),
    supabase.from("personas").select("*", { count: "exact", head: true })
  ]);

  if (subError || personaError) {
    console.error("Error fetching communities data:", { subError, personaError });
  }

  return (
    <CommunityListClient 
      initialCommunities={communities || []} 
      totalPersonas={totalPersonas ?? 0} 
    />
  );
}
