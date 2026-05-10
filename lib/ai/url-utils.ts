const PROXY_PATTERNS = [
  "vertexaisearch.cloud.google.com",
  "google.com/url",
  "googleusercontent.com",
];

export function sanitizeSourceUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let cleanUrl: string = url;

  if (PROXY_PATTERNS.some(p => cleanUrl.includes(p))) {
    try {
      const parsed = new URL(cleanUrl);
      const real = parsed.searchParams.get("url") ?? parsed.searchParams.get("q");
      cleanUrl = real ?? "";
    } catch {
      return null;
    }
  }

  try {
    const parsed = new URL(cleanUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return cleanUrl;
  } catch {
    return null;
  }
}

export function buildFallbackUrl(headline: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(headline)}`;
}

/**
 * Returns true when a URL is a Google Search fallback (not a real source URL).
 * Used by UI components to show "Search" instead of "Source" label.
 */
export function isSearchFallback(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("https://www.google.com/search");
}
