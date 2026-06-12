interface ProviderErrorPayload {
  error?: {
    code?: number | string;
    message?: string;
    status?: string;
  };
  code?: number | string;
  message?: string;
  status?: string;
}

function parseErrorPayload(raw: string): ProviderErrorPayload | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;

  try {
    return JSON.parse(trimmed) as ProviderErrorPayload;
  } catch {
    return null;
  }
}

export function formatProviderError(provider: string, raw: string): string {
  const payload = parseErrorPayload(raw);
  const details = payload?.error ?? payload;
  const code = details?.code;
  const status = details?.status;
  const message = details?.message;

  if (code || status || message) {
    const codeLabel = code ? ` ${code}` : "";
    const statusLabel = status ? ` (${status})` : "";
    const messageLabel = message ? `: ${message}` : "";
    return `${provider} API error${codeLabel}${statusLabel}${messageLabel}`;
  }

  return `${provider} API error: ${raw}`;
}

export function describeGenerationFailure(
  error: string | undefined,
  rawResponse: string | undefined,
  emptyLabel = "AI provider returned an empty response"
): string {
  if (error) return error;
  if (rawResponse) return `AI response was not valid JSON. Response: ${rawResponse.slice(0, 300)}`;
  return emptyLabel;
}
