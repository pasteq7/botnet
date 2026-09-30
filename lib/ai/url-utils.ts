// lib\ai\url-utils.ts
import { fetchWithTimeout } from "@/lib/ai/fetch-utils";

const PROXY_PATTERNS = [
  "vertexaisearch.cloud.google.com",
  "google.com/url",
  "googleusercontent.com",
];

function isFetchableGoogleProxy(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && (
      parsed.hostname === "vertexaisearch.cloud.google.com" ||
      ((parsed.hostname === "google.com" || parsed.hostname === "www.google.com") && parsed.pathname === "/url")
    );
  } catch {
    return false;
  }
}

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
 * Resolve known Google proxy URLs without requesting their destinations.
 */
export async function resolveProxyUrl(url: string): Promise<string> {
  if (!url) return url;

  let currentUrl = url;
  // First try synchronous query-string extraction
  if (PROXY_PATTERNS.some(p => currentUrl.includes(p))) {
    const extracted = extractUrlFromProxy(currentUrl);
    if (extracted) currentUrl = extracted;
  }

  // Only request an exact Google proxy host, and inspect one redirect manually.
  if (isFetchableGoogleProxy(currentUrl)) {
    try {
      const res = await fetchWithTimeout(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
      }, 4_000, "Proxy URL resolution failed");
      const location = res.headers.get("location");
      if (location) return new URL(location, currentUrl).toString();
    } catch {
      // Keep the proxy URL when it cannot be resolved.
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
