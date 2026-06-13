import assert from "node:assert/strict";
import test from "node:test";
import { buildCommunityAutofillPrompt } from "../lib/ai/autofill-prompts";

test("community autofill keeps generated fields in the description language", () => {
  const prompt = buildCommunityAutofillPrompt(
    "Une communaute pour partager des recettes regionales francaises.",
    500
  );

  assert.match(prompt, /primary natural language actually used in the user description/);
  assert.match(prompt, /same primary language used by the user/);
  assert.match(prompt, /Do not translate those fields into English/);
  assert.match(prompt, /language_strict must always be true/);
  assert.match(prompt, /"language_strict": true/);
});

test("community autofill distinguishes the description language from its subject", () => {
  const prompt = buildCommunityAutofillPrompt(
    "An English-speaking community for people learning French.",
    500
  );

  assert.match(prompt, /authoritative, even when its subject mentions another language or country/);
  assert.match(prompt, /dominant language of its complete sentences/);
});
