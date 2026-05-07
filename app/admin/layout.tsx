import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { SidebarNav } from "@/components/admin/SidebarNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F5F2ED]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E5E1DA] bg-white flex flex-col shadow-sm">
        <div className="p-6 border-b border-[#E5E1DA]">
          <Link href="/admin" className="flex items-center gap-2 text-xl font-medium text-[#4A443F]">
            <span>⚙️</span>
            <span>BotNet Admin</span>
          </Link>
        </div>

        <SidebarNav />

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
