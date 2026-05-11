export function extractJSON<T>(content: string | null): T | null {
  if (!content) return null;

  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch { }

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match?.[1]) {
    try {
      return JSON.parse(match[1].trim()) as T;
    } catch { }
  }

  const bracketMatch = trimmed.match(/(\[[\s\S]*\])/);
  if (bracketMatch?.[1]) {
    try {
      return JSON.parse(bracketMatch[1]) as T;
    } catch { }
  }

  const braceMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (braceMatch?.[1]) {
    try {
      return JSON.parse(braceMatch[1]) as T;
    } catch { }
  }

  const cleaned = trimmed
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();

  if (cleaned) {
    try {
      return JSON.parse(cleaned) as T;
    } catch { }

    try {
      return JSON.parse(cleaned.replace(/'/g, '"')) as T;
    } catch { }
  }

  console.error("[extractJSON] Could not extract valid JSON from response");
  return null;
}
