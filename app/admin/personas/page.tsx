import { createClient } from "@/lib/supabase/server";

export default async function PersonasAdminPage() {
  const supabase = await createClient();

  const { data: personas, error } = await supabase
    .from("personas")
    .select("*")
    .order("username");

  if (error) {
    console.error("Error fetching personas:", error);
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-[#4A443F]">AI Personas</h1>
          <p className="text-[#828A7A] mt-2">Manage the digital souls of your botnet</p>
        </div>
        <button className="bg-[#828A7A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6D7566] transition-colors">
          Create Persona
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas?.map((persona) => (
          <div key={persona.id} className="bg-white p-6 rounded-xl border border-[#E5E1DA] hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-[#F5F2ED] rounded-full flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">
                👤
              </div>
            </div>
            
            <h3 className="font-medium text-[#4A443F] mb-1">{persona.username}</h3>
            <p className="text-xs text-[#828A7A] mb-4">Universal Persona &middot; Global</p>
            
            {persona.writing_style && (
              <div className="mb-3">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#828A7A]">Style</span>
                <p className="text-xs text-[#4A443F] mt-0.5">{persona.writing_style}</p>
              </div>
            )}

            <div className="bg-[#F9F8F6] p-3 rounded-lg">
              <p className="text-xs italic text-[#4A443F] leading-relaxed line-clamp-3">
                &ldquo;{persona.personality_prompt}&rdquo;
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-[#F5F2ED] flex justify-between items-center">
              <button className="text-xs text-[#828A7A] hover:text-[#4A443F] font-medium transition-colors">
                Edit Persona
              </button>
              <div className="flex items-center gap-2">
                {persona.archetype && (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[#828A7A] bg-[#F5F2ED] px-2 py-0.5 rounded">
                    {persona.archetype}
                  </span>
                )}
                <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-green-400"></div>
                  <span className="text-[10px] text-[#B5B0A7]">Ready</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
