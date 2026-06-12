export type RequestTier = "fast" | "normal" | "bulk";

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);

interface ErrorLike {
  status?: number;
  statusCode?: number;
  code?: number;
  name?: string;
  message?: string;
  cause?: { code?: string };
  error?: { status?: string };
}

export function isRetryableError(err: unknown): boolean {
  if (!err) return false;

  if (typeof err === "object") {
    const e = err as ErrorLike;
    const code = e.status ?? e.statusCode ?? e.code;
    if (typeof code === "number" && RETRYABLE_STATUSES.has(code)) return true;
    if (typeof e.cause?.code === "string") {
      const causeCode = e.cause.code.toLowerCase();
      if (["econnreset", "und_err_socket", "etimedout", "econnrefused"].includes(causeCode)) return true;
    }
    // Google GenAI ApiError: status is a string like "INTERNAL", "UNAVAILABLE"
    const status = e.error?.status;
    if (status === "INTERNAL" || status === "UNAVAILABLE") return true;
  }

  const msg = err instanceof Error ? err.message : String(err);

  // Try parsing the message as JSON — Google GenAI serializes errors this way
  try {
    const parsed = JSON.parse(msg);
    const status = parsed?.error?.status;
    const code = parsed?.error?.code;
    if (status === "INTERNAL" || status === "UNAVAILABLE") return true;
    if (typeof code === "number" && RETRYABLE_STATUSES.has(code)) return true;
  } catch {
    // not JSON, fall through to string matching
  }

  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) return true;

  const retryablePhrases = ["fetch failed", "network", "econnrefused", "econnreset", "und_err_socket", "timeout",
    "aborted", "terminated", "socket", "other side closed", "internal error", "server error", "overloaded", "service unavailable"];
  const lower = msg.toLowerCase();
  if (retryablePhrases.some(p => lower.includes(p))) return true;

  // Check for HTTP status codes in messages like "500: ..." or "502: ..."
  const statusMatch = lower.match(/(?:^|api error )(\d{3})(?::|\s|\()/);
  if (statusMatch) {
    const code = parseInt(statusMatch[1], 10);
    if (RETRYABLE_STATUSES.has(code)) return true;
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

export function withAbortTimeout<T>(factory: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(Object.assign(new Error("Request timed out"), { name: "TimeoutError" }));
    }, ms);
  });
  return Promise.race([factory(controller.signal), timeout]).finally(() => clearTimeout(timer));
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
  const { maxRetries = 3, baseDelayMs = 2000, maxDelayMs = 300000 } = options;

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
