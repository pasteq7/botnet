import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SubredditsAdminPage() {
  const supabase = await createClient();

  const { data: subreddits } = await supabase
    .from("subreddits")
    .select("*, personas:personas(count)")
    .order("name");

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-[#4A443F]">Subreddits</h1>
          <p className="text-[#828A7A] mt-2">Manage your target communities</p>
        </div>
        <button className="bg-[#828A7A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6D7566] transition-colors">
          Add New Sub
        </button>
      </header>

      <div className="bg-white rounded-xl border border-[#E5E1DA] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F9F8F6] border-b border-[#E5E1DA]">
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Subreddit</th>
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Status</th>
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Personas</th>
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E1DA]">
            {subreddits?.map((sub) => (
              <tr key={sub.id} className="hover:bg-[#F9F8F6] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl bg-[#F5F2ED] w-10 h-10 flex items-center justify-center rounded-lg">
                      {sub.icon_emoji || "🏘️"}
                    </span>
                    <div>
                      <p className="font-medium text-[#4A443F]">{sub.name}</p>
                      <p className="text-xs text-[#828A7A]">r/{sub.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    sub.is_active 
                      ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" 
                      : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10"
                  }`}>
                    {sub.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[#4A443F]">
                  {sub.personas?.[0]?.count ?? 0} users
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={`/admin/subreddits/${sub.id}`}
                    className="text-[#828A7A] hover:text-[#4A443F] text-sm font-medium underline underline-offset-4 decoration-[#E5E1DA] hover:decoration-[#828A7A] transition-all"
                  >
                    Edit & Trigger
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
