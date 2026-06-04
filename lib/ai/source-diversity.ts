import type { SearchResult } from "@/types";

const EVERGREEN_HOSTS = ["wikipedia.org", "github.com"];

export function canonicalSourceUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    parsed.hash = "";
    parsed.search = "";
    parsed.hostname = parsed.hostname.toLowerCase();

    let pathname = decodeURIComponent(parsed.pathname);
    pathname = pathname.replace(/\/+$/, "");
    parsed.pathname = pathname || "/";

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isRecentlyCoveredUrl(
  url: string | null | undefined,
  recentUrls: Array<string | null | undefined>
): boolean {
  const canonical = canonicalSourceUrl(url);
  if (!canonical) return false;

  return recentUrls.some((recent) => canonicalSourceUrl(recent) === canonical);
}

export function filterRecentlyCoveredResults(
  results: SearchResult[],
  recentUrls: Array<string | null | undefined>
): SearchResult[] {
  if (!recentUrls.length) return results;
  return results.filter((result) => !isRecentlyCoveredUrl(result.url, recentUrls));
}

export function isEvergreenSourceUrl(url: string | null | undefined): boolean {
  const canonical = canonicalSourceUrl(url);
  if (!canonical) return false;

  try {
    const host = new URL(canonical).hostname;
    return EVERGREEN_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

