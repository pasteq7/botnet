const PROXY_PATTERNS = [
  "vertexaisearch.cloud.google.com",
  "google.com/url",
  "googleusercontent.com",
];

export function sanitizeSourceUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  if (PROXY_PATTERNS.some(p => url.includes(p))) {
    try {
      const parsed = new URL(url);
      const real = parsed.searchParams.get("url") ?? parsed.searchParams.get("q");
      url = real ?? "";
    } catch {
      return null;
    }
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (parsed.pathname === "/" || parsed.pathname === "") return null;
    return url;
  } catch {
    return null;
  }
}
