import { inputCls, labelCls, hintCls } from "./types";
import { COMMUNITY_TEXT_MAX_LENGTH } from "@/lib/community-fields";

export function TextareaField({
  label, hint, value, onChange, required = false, rows = 6,
}: {
  label: string; hint: string; value: string;
  onChange: (v: string) => void; required?: boolean; rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelCls}>{label}{required && <span className="text-accent ml-1">*</span>}</label>
      <p className={hintCls}>{hint}</p>
      <div className="relative">
        <textarea
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          maxLength={COMMUNITY_TEXT_MAX_LENGTH}
          className={inputCls + " resize-none pr-14 min-h-[120px]"}
        />
        <span className="absolute bottom-2.5 right-3 text-xs font-mono text-muted/50 select-none">
          {value.length}/{COMMUNITY_TEXT_MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
