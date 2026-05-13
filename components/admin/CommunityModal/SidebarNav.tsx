import { Settings, FileText, AlertTriangle } from "lucide-react";
import type { NavSection } from "./types";

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ReactNode }[] = [
  { id: "settings", label: "Settings", icon: <Settings className="size-3.5" /> },
  { id: "content", label: "Content", icon: <FileText className="size-3.5" /> },
];

export function SidebarNav({
  activeSection, onSectionChange, showDanger,
}: {
  activeSection: NavSection;
  onSectionChange: (s: NavSection) => void;
  showDanger: boolean;
}) {
  return (
    <nav className="w-48 shrink-0 border-r border-border/10 py-4 flex flex-col gap-0.5 px-3 bg-surface/10">
      {[...NAV_ITEMS, ...(showDanger ? [{ id: "danger" as NavSection, label: "Danger zone", icon: <AlertTriangle className="size-3.5" /> }] : [])].map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSectionChange(id)}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${activeSection === id
            ? " text-accent ring-1 ring-accent"
            : "text-muted/70 hover:bg-surface/60 hover:text-foreground"
            }`}
        >
          <span className={activeSection === id ? "bg-accent/10 text-accent" : "text-muted/30"}>
            {icon}
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}
