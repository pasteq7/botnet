import { Grid3x3, Languages } from "lucide-react";
import { CommunityIcon } from "@/components/ui/CommunityIcon";
import { labelCls, hintCls, inputCls } from "./types";

export function IconLanguageRow({
  iconName, language, languageStrict,
  onLanguageChange, onLanguageStrictChange, onOpenIconPicker,
}: {
  iconName: string;
  language: string;
  languageStrict: boolean;
  onIconNameChange: (name: string) => void;
  onLanguageChange: (lang: string) => void;
  onLanguageStrictChange: (strict: boolean) => void;
  onOpenIconPicker: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-6">

      {/* ── Icon ── */}
      <div className="space-y-1.5">
        <label className={labelCls}>Icon</label>
        <p className={hintCls}>Choose an icon to represent this community.</p>

        <button
          type="button"
          onClick={onOpenIconPicker}
          className="group h-9 w-full flex items-center gap-3 px-3 rounded-lg
                     bg-background/30 border border-border/30
                     hover:bg-surface/60 hover:border-accent/40
                     transition-all duration-150 text-left"
        >
          <div className="p-1.5 rounded-md bg-surface border border-border/30
                          group-hover:border-accent/30 transition-colors shrink-0">
            <CommunityIcon name={iconName || "Hash"} size="sm" />
          </div>

          <span className="flex-1 text-sm text-foreground truncate">
            {iconName || <span className="text-muted/60">No icon selected</span>}
          </span>

          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold
                           text-foreground/70 bg-surface border border-border/40 rounded-md
                           group-hover:text-accent group-hover:border-accent/40
                           transition-all shrink-0">
            <Grid3x3 className="size-3" />
            Browse
          </span>
        </button>
      </div>

      {/* ── Language ── */}
      <div className="space-y-1.5">
        <label className={labelCls}>Language</label>
        <p className={hintCls}>
          Primary language for content generation{" "}
          <span className="text-muted/50">(e.g. en, es, fr)</span>
        </p>

        <div className="flex items-center gap-2 h-9">

          {/* Input */}
          <div className="relative flex-1 h-full">
            <Languages className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted/50 pointer-events-none" />
            <input
              value={language || "english"}
              onChange={(e) => onLanguageChange(e.target.value)}
              className={`${inputCls} h-full pl-8`}
              placeholder="english"
              maxLength={10}
            />
          </div>

          {/* Strict toggle pill */}
          <button
            type="button"
            role="switch"
            aria-checked={languageStrict}
            onClick={() => onLanguageStrictChange(!languageStrict)}
            className={`flex items-center gap-2 h-full px-3 rounded-lg border transition-all duration-150
                        cursor-pointer shrink-0
                        ${languageStrict
                ? "bg-accent/10 border-accent/40 text-accent"
                : "bg-background/30 border-border/30 text-muted/60 hover:border-border/60"
              }`}
          >
            <span className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent
                              transition-colors duration-200
                              ${languageStrict ? "bg-accent" : "bg-border/40"}`}>
              <span className={`inline-block h-3 w-3 rounded-full bg-white shadow
                                transition-transform duration-200
                                ${languageStrict ? "translate-x-3" : "translate-x-0"}`} />
            </span>

            <span className="flex flex-col text-left leading-tight">
              <span className="text-xs font-semibold">Strict</span>
              <span className="text-xs opacity-70 whitespace-nowrap">Lang-only</span>
            </span>
          </button>

        </div>
      </div>

    </div>
  );
}