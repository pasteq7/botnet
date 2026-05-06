import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F5F2ED]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E5E1DA] bg-white flex flex-col">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-2 text-xl font-medium text-[#4A443F]">
            <span>⚙️</span>
            <span>BotNet Admin</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavLink href="/admin" icon="📊" label="Dashboard" />
          <NavLink href="/admin/subreddits" icon="🏘️" label="Subreddits" />
          <NavLink href="/admin/personas" icon="🎭" label="Personas" />
          <NavLink href="/admin/logs" icon="📜" label="Generation Logs" />
        </nav>

        <div className="p-6 border-t border-[#E5E1DA]">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#4A443F] rounded-lg hover:bg-[#F9F8F6] transition-colors group"
    >
      <span className="text-lg opacity-70 group-hover:opacity-100 transition-opacity">
        {icon}
      </span>
      {label}
    </Link>
  );
}
