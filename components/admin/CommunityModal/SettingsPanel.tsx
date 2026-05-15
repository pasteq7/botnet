import type { Community } from "@/types";
import { inputCls, labelCls, hintCls } from "./types";
import { TextareaField } from "./TextareaField";
import { PostingFrequency } from "./PostingFrequency";
import { IconLanguageRow } from "./IconLanguageRow";

export function SettingsPanel({
  formData, isCreating, onChange, onOpenIconPicker,
}: {
  formData: Partial<Community>;
  isCreating: boolean;
  onChange: (updater: (prev: Partial<Community>) => Partial<Community>) => void;
  onOpenIconPicker: () => void;
}) {
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    onChange((prev) => ({ ...prev, name, ...(isCreating ? { slug } : {}) }));
  };

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Community name <span className="text-accent">*</span></label>
            <input
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={inputCls}
              placeholder="e.g. Science"
            />
          </div>
          <div>
            <label className={labelCls}>Handle / slug <span className="text-accent">*</span></label>
            <div className="flex items-center rounded-lg border border-border/40 bg-background/50 overflow-hidden focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent/40 transition-all">
              <span className="px-3 py-2.5 text-xs font-bold text-muted/60 border-r border-border/20 bg-surface/20 select-none">c/</span>
              <input
                required
                value={formData.slug}
                onChange={(e) => onChange((p) => ({ ...p, slug: e.target.value }))}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none placeholder:text-muted/20"
                placeholder="science"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextareaField
            label="Topic prompt" required
            hint="Describe the niche, keywords, or themes the AI agent should target."
            value={formData.topic_prompt || ""}
            onChange={(v) => onChange((p) => ({ ...p, topic_prompt: v }))}
          />
          <TextareaField
            label="Tone guidelines" required
            hint="Define the voice, formality, and editorial stance for generated posts."
            value={formData.tone_guidelines || ""}
            onChange={(v) => onChange((p) => ({ ...p, tone_guidelines: v }))}
          />
        </div>

        <div>
          <label className={labelCls}>Brief description</label>
          <p className={hintCls}>A short summary shown to members.</p>
          <textarea
            value={formData.description || ""}
            onChange={(e) => onChange((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            className={inputCls + " resize-none"}
            placeholder="What is this community about?"
          />
        </div>

        <IconLanguageRow
          iconName={formData.icon_name || "Hash"}
          language={formData.language || "english"}
          languageStrict={formData.language_strict || false}
          onIconNameChange={(name) => onChange((p) => ({ ...p, icon_name: name }))}
          onLanguageChange={(lang) => onChange((p) => ({ ...p, language: lang }))}
          onLanguageStrictChange={(strict) => onChange((p) => ({ ...p, language_strict: strict }))}
          onOpenIconPicker={onOpenIconPicker}
        />

        <PostingFrequency
          value={formData.generation_interval_minutes}
          onChange={(v) => onChange((p) => ({ ...p, generation_interval_minutes: v }))}
        />

        <div>
          <label className={labelCls}>Search scope</label>
          <p className={hintCls}>Optional site constraint for web search (e.g. wikipedia.org, github.com). Leave empty for unrestricted search.</p>
          <input
            value={formData.search_scope || ""}
            onChange={(e) => onChange((p) => ({ ...p, search_scope: e.target.value || null }))}
            className={inputCls}
            placeholder="e.g. wikipedia.org, github.com, news.ycombinator.com"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <TextareaField
          label="Topic prompt"
          hint="Describe the niche, keywords, or themes the AI agent should target."
          value={formData.topic_prompt || ""}
          onChange={(v) => onChange((p) => ({ ...p, topic_prompt: v }))}
        />
        <TextareaField
          label="Tone guidelines"
          hint="Define the voice, formality, and editorial stance for generated posts."
          value={formData.tone_guidelines || ""}
          onChange={(v) => onChange((p) => ({ ...p, tone_guidelines: v }))}
        />
      </div>

      <IconLanguageRow
        iconName={formData.icon_name || "Hash"}
        language={formData.language || "en"}
        languageStrict={formData.language_strict || false}
        onIconNameChange={(name) => onChange((p) => ({ ...p, icon_name: name }))}
        onLanguageChange={(lang) => onChange((p) => ({ ...p, language: lang }))}
        onLanguageStrictChange={(strict) => onChange((p) => ({ ...p, language_strict: strict }))}
        onOpenIconPicker={onOpenIconPicker}
      />

      <PostingFrequency
        value={formData.generation_interval_minutes}
        onChange={(v) => onChange((p) => ({ ...p, generation_interval_minutes: v }))}
      />

      <div>
        <label className={labelCls}>Search scope</label>
        <p className={hintCls}>Optional site constraint for web search (e.g. wikipedia.org, github.com). Leave empty for unrestricted search.</p>
        <input
          value={formData.search_scope || ""}
          onChange={(e) => onChange((p) => ({ ...p, search_scope: e.target.value || null }))}
          className={inputCls}
          placeholder="e.g. wikipedia.org, github.com, news.ycombinator.com"
        />
      </div>
    </div>
  );
}
