interface FetchErrorCause {
  code?: string;
}

function getCauseCode(err: unknown): string | undefined {
  const cause = (err as { cause?: FetchErrorCause } | null)?.cause;
  return typeof cause?.code === "string" ? cause.code : undefined;
}

export function describeFetchError(err: unknown, label: string): Error {
  if (err instanceof Error) {
    const causeCode = getCauseCode(err);
    const suffix = causeCode ? ` (${causeCode})` : "";
    return new Error(`${label}: ${err.message}${suffix}`);
  }

  return new Error(`${label}: ${String(err)}`);
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 30_000,
  label = "fetch failed"
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } catch (err) {
    throw describeFetchError(err, label);
  } finally {
    clearTimeout(timeout);
  }
}
