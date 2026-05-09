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
    if (parsed.pathname === "/" || parsed.pathname === "") return null;
    return cleanUrl;
  } catch {
    return null;
  }
}

export function buildFallbackUrl(headline: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(headline)}`;
}
