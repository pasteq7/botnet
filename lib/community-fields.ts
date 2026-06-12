export const COMMUNITY_TEXT_MAX_LENGTH = 500;
export const COMMUNITY_SLUG_MAX_LENGTH = 80;

export const COMMUNITY_TEXT_FIELDS = [
  "name",
  "description",
  "topic_prompt",
  "tone_guidelines",
] as const;

type CommunityTextField = (typeof COMMUNITY_TEXT_FIELDS)[number];

export function truncateCommunityTextFields(
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...source };

  for (const field of COMMUNITY_TEXT_FIELDS) {
    const value = result[field];
    if (typeof value === "string") {
      result[field] = value.slice(0, COMMUNITY_TEXT_MAX_LENGTH);
    }
  }

  return result;
}

export function getCommunityTextLimitError(
  source: Record<string, unknown>
): string | null {
  for (const field of COMMUNITY_TEXT_FIELDS) {
    const value = source[field];
    if (typeof value === "string" && value.length > COMMUNITY_TEXT_MAX_LENGTH) {
      return `${formatFieldName(field)} must be ${COMMUNITY_TEXT_MAX_LENGTH} characters or fewer`;
    }
  }

  return null;
}

export function normalizeCommunitySlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, COMMUNITY_SLUG_MAX_LENGTH);
}

export function getCommunitySlugError(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return "slug is required";
  }
  if (value.length > COMMUNITY_SLUG_MAX_LENGTH) {
    return `slug must be ${COMMUNITY_SLUG_MAX_LENGTH} characters or fewer`;
  }
  if (normalizeCommunitySlug(value) !== value) {
    return "slug must contain only lowercase letters, numbers, and single dashes";
  }
  return null;
}

function formatFieldName(field: CommunityTextField): string {
  return field.replaceAll("_", " ");
}
