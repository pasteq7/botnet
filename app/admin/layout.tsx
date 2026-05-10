import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { SidebarNav } from "@/components/admin/SidebarNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col shadow-sm">
        <div className="p-6 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2 text-xl font-medium text-foreground">
            <Image src="/icon.svg" alt="BotNet" width={24} height={24} className="size-6" />
            <span>BotNet Admin</span>
          </Link>
        </div>

        <SidebarNav />

        <div className="p-6 border-t border-border">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto text-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}
