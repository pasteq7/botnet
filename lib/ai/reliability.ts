export type RequestTier = "fast" | "normal" | "bulk";

export type LimitState = {
  rpm: number;
  rpd: number;
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);

interface ErrorLike {
  status?: number;
  statusCode?: number;
  name?: string;
  message?: string;
}

export function isRetryableError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as ErrorLike;
    const status = e.status ?? e.statusCode;
    if (typeof status === "number" && RETRYABLE_STATUSES.has(status)) return true;
    if (e.name === "AbortError" || e.name === "TimeoutError") return true;
    const msg = e.message ?? "";
    if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("econnrefused")) return true;
  }
  return false;
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(Object.assign(new Error("Request timed out"), { name: "TimeoutError" })),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  tier?: RequestTier;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 10000, maxDelayMs = 300000 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !isRetryableError(err)) {
        throw err;
      }

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelayMs
      );
      console.warn(
        `[reliability] Retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms. Reason: ${err instanceof Error ? err.message : String(err)}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function getTimeoutForTier(tier: RequestTier): number {
  switch (tier) {
    case "fast":
      return 45_000; // Increased from 15s
    case "normal":
      // Browser tools or Search tools can take a long time
      return 180_000; // Increased from 90s
    case "bulk":
      return 300_000; // Increased from 120s
  }
}
