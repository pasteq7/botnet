import { createClient } from "@/lib/supabase/server";
import CommunityListClient from "./CommunityListClient";

export default async function CommunitiesAdminPage() {
  const supabase = await createClient();

  const [
    { data: communities, error: subError },
  ] = await Promise.all([
    supabase.from("communities").select("*").order("name"),
  ]);

  if (subError) {
    console.error("Error fetching communities data:", { subError });
  }

  return (
    <CommunityListClient 
      initialCommunities={communities || []} 
    />
  );
}
