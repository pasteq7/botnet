import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMUNITY_TEXT_MAX_LENGTH,
  getCommunitySlugError,
  getCommunityTextLimitError,
  normalizeCommunitySlug,
  truncateCommunityTextFields,
} from "../lib/community-fields";

test("community text validation accepts fields at the 500 character limit", () => {
  assert.equal(
    getCommunityTextLimitError({
      name: "n".repeat(COMMUNITY_TEXT_MAX_LENGTH),
      description: "d".repeat(COMMUNITY_TEXT_MAX_LENGTH),
      topic_prompt: "p".repeat(COMMUNITY_TEXT_MAX_LENGTH),
      tone_guidelines: "t".repeat(COMMUNITY_TEXT_MAX_LENGTH),
    }),
    null
  );
});

test("community slugs are normalized for editable URLs", () => {
  assert.equal(normalizeCommunitySlug("  Fiction!! Archive  "), "fiction-archive");
  assert.equal(getCommunitySlugError("fiction-archive"), null);
  assert.match(getCommunitySlugError("Fiction Archive") ?? "", /lowercase letters/);
});

test("community text validation identifies fields over the limit", () => {
  assert.equal(
    getCommunityTextLimitError({
      description: "d".repeat(COMMUNITY_TEXT_MAX_LENGTH + 1),
    }),
    "description must be 500 characters or fewer"
  );
});

test("autofill cleanup truncates community fields without changing other values", () => {
  const result = truncateCommunityTextFields({
    topic_prompt: "p".repeat(COMMUNITY_TEXT_MAX_LENGTH + 20),
    language: "english",
  });

  assert.equal((result.topic_prompt as string).length, COMMUNITY_TEXT_MAX_LENGTH);
  assert.equal(result.language, "english");
});
