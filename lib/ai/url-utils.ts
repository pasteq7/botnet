// lib\ai\url-utils.ts
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

/**
 * Actively resolves proxy URLs (like vertexaisearch) by following HTTP redirects.
 */
export async function resolveProxyUrl(url: string): Promise<string> {
  if (!url) return url;

  let currentUrl = url;
  // First try synchronous query-string extraction
  if (PROXY_PATTERNS.some(p => currentUrl.includes(p))) {
    const extracted = extractUrlFromProxy(currentUrl);
    if (extracted) currentUrl = extracted;
  }

  // If it's still a Google proxy, do a lightweight HEAD request to follow the 302 redirect
  if (currentUrl.includes("vertexaisearch.cloud.google.com") || currentUrl.includes("google.com/url")) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.url && !res.url.includes("vertexaisearch.cloud.google.com")) {
        return res.url; // We successfully followed the redirect to the real site
      }
    } catch {
      // Silent catch, fallback to returning the proxy URL
    }
  }

  return currentUrl;
}

export function buildFallbackUrl(headline: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(headline)}`;
}

export function isSearchFallback(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("https://www.google.com/search");
}