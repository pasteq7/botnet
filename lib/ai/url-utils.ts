const PROXY_PATTERNS = [
  "vertexaisearch.cloud.google.com",
  "google.com/url",
  "googleusercontent.com",
];

function extractUrlFromProxy(proxyUrl: string): string | null {
  try {
    const parsed = new URL(proxyUrl);

    const candidates = ["url", "q", "u", "target", "redirect_uri", "destination", "dest", "redirect_url"];
    for (const param of candidates) {
      const val = parsed.searchParams.get(param);
      if (val) {
        try {
          new URL(val);
          return val;
        } catch {
          continue;
        }
      }
    }

    const pathMatch = proxyUrl.match(/\/redirect(?:\/[^\/]+)?\/(https?:\/\/[^\s]+)/);
    if (pathMatch) return pathMatch[1];

    return null;
  } catch {
    return null;
  }
}

export function sanitizeSourceUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let cleanUrl: string = url;

  if (PROXY_PATTERNS.some(p => cleanUrl.includes(p))) {
    const extracted = extractUrlFromProxy(cleanUrl);
    if (extracted) {
      cleanUrl = extracted;
    } else {
      cleanUrl = url;
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
