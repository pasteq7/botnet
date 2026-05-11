import { createClient } from "@/lib/supabase/server";
import PersonaListClient from "./PersonaListClient";

export default async function PersonasAdminPage() {
  const supabase = await createClient();

  const { data: personas, error } = await supabase
    .from("personas")
    .select("*, persona_communities(community_id, communities(name, slug))")
    .order("username");

  if (error) {
    console.error("Error fetching personas:", error);
  }

  return (
    <PersonaListClient initialPersonas={personas || []} />
  );
}
