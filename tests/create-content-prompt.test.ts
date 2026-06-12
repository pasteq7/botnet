import assert from "node:assert/strict";
import test from "node:test";
import { buildCreationBriefPrompt, buildThreadPrompt } from "../lib/ai/prompts";
import type { Community, ContentPayload, Persona } from "../types";

const community: Community = {
  id: "community-1",
  slug: "fantasy-writers",
  name: "Fantasy Writers",
  description: "A community for original fantasy fiction.",
  icon_name: "BookOpen",
  topic_prompt: "Write vivid fantasy stories with strong characters and complete scenes.",
  tone_guidelines: "Imaginative, specific, and welcoming.",
  content_modes: ["create"],
  content_mode_weights: {
    news: 0,
    discussion: 0,
    tips: 0,
    ask: 0,
    create: 1,
    "web-search": 0,
  },
  language: "en",
  language_strict: false,
  is_active: true,
  search_scope: null,
};

const persona: Persona = {
  id: "persona-1",
  username: "AshQuill",
  avatar_seed: "ash-quill",
  personality_prompt: "Writes atmospheric fantasy with restrained dialogue.",
  writing_style: "Close third person with sensory detail.",
  scope: "global",
};

const content: ContentPayload = {
  mode: "create",
  headline: "The Bell Beneath the Salt",
  summary: "A complete fantasy scene about a lighthouse keeper who hears a buried bell.",
  angle: "Treat the supernatural event as an old debt coming due.",
  why_interesting: "It gives readers a finished piece of original fiction.",
};

test("create mode asks the persona to publish the artifact rather than discuss it", () => {
  const prompt = buildThreadPrompt(community, persona, content);

  assert.match(prompt, /Create and publish the original work/);
  assert.match(prompt, /body must be the original artifact itself/);
  assert.match(prompt, /not advice, analysis, a prompt, an outline/);
  assert.match(prompt, /complete short piece or a substantial self-contained scene/);
  assert.doesNotMatch(prompt, /Start the body with a 2-3 sentence factual summary/);
});

test("creation briefs force fiction away from a repeated science-fiction cluster", () => {
  const prompt = buildCreationBriefPrompt(community, [
    {
      headline: "Observation of impossible time, space, and geometry",
      body: "An isolated observer records impossible sensory distortions.",
    },
    {
      headline: "Mapping physically impossible geometry",
      body: "A clinical report from silent ruins.",
    },
    {
      headline: "Existential log from deep isolation",
      body: "A log about a cosmic anomaly.",
    },
  ]);

  assert.match(prompt, /Fiction is broader than science fiction/);
  assert.match(prompt, /must use a different genre family and a different form/);
  assert.match(prompt, /Mapping physically impossible geometry/);
  assert.match(prompt, /clinical report from silent ruins/);
});
