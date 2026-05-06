import { GoogleGenAI } from "@google/genai";
import {
  retryWithBackoff,
  withTimeout,
  getTimeoutForTier,
} from "./reliability";
import type { RequestTier } from "./reliability";

// --- Gemini client singleton ---

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return new GoogleGenAI({ apiKey: key });
}

let _gemini: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_gemini) {
    _gemini = getGemini();
  }
  return _gemini;
}

export const GENERATIVE_MODEL = "gemma-4-26b-a4b-it";
export const FALLBACK_MODEL = "gemma-4-31b-it";

/**
 * Safely extracts JSON from a string that might contain markdown code blocks.
 */
export function extractJSON<T>(content: string | null): T | null {
  if (!content) return null;

  try {
    // 1. Try direct parse first
    return JSON.parse(content) as T;
  } catch {
    // 2. Try to find JSON inside markdown blocks
    const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]) as T;
      } catch (err) {
        console.error("[extractJSON] Failed to parse content inside backticks:", err);
      }
    }

    // 3. Try to find anything between { and }
    const braceMatch = content.match(/(\{[\s\S]*\})/);
    if (braceMatch && braceMatch[1]) {
      try {
        return JSON.parse(braceMatch[1]) as T;
      } catch (err) {
        console.error("[extractJSON] Failed to parse content between braces:", err);
      }
    }

    console.error("[extractJSON] Could not extract valid JSON from response");
    return null;
  }
}

// --- Usage Tracker ---

export class UsageTracker {
  private rpmWindow: number[] = [];
  private rpdCount = 0;
  private rpdDate: string;

  private static instance: UsageTracker;

  static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  private constructor() {
    this.rpdDate = new Date().toISOString().slice(0, 10);
  }

  recordRequest(): void {
    const now = Date.now();
    this.rpmWindow.push(now);

    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.rpdDate) {
      this.rpdCount = 0;
      this.rpdDate = today;
    }
    this.rpdCount++;
  }

  getLimitState(): { rpm: number; rpd: number } {
    this.prune();
    return {
      rpm: this.rpmWindow.length,
      rpd: this.rpdCount,
    };
  }

  private prune(): void {
    const now = Date.now();
    const cutoff = now - 60_000;
    this.rpmWindow = this.rpmWindow.filter((t) => t > cutoff);
  }

  async waitIfNeeded(): Promise<void> {
    this.prune();

    if (this.rpdCount >= 1500) {
      throw new Error("RPD limit exceeded (1500/1500)");
    }

    if (this.rpmWindow.length >= 15) {
      const oldest = this.rpmWindow[0];
      const waitMs = oldest + 60_000 - Date.now() + 100;
      if (waitMs > 0) {
        console.warn(
          `[usage] RPM limit reached (${this.rpmWindow.length}/15). Waiting ${Math.round(waitMs)}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      this.prune();
    }

    if (this.rpmWindow.length >= 12) {
      console.warn(
        `[usage] Rate limit approaching (${this.rpmWindow.length}/15 RPM)`
      );
    }
  }
}

// --- Robust Generate ---

export interface RobustGenerateConfig {
  tier?: RequestTier;
  timeoutMs?: number;
  maxRetries?: number;
  fallbackModel?: string;
  fallbackContent?: string;
  config?: Record<string, unknown>;
}

export async function robustGenerate(
  contents: string,
  options: RobustGenerateConfig = {}
): Promise<string | null> {
  const {
    tier = "normal",
    timeoutMs = getTimeoutForTier(tier),
    maxRetries = 3,
    fallbackModel = FALLBACK_MODEL,
    fallbackContent,
    config,
  } = options;

  const tracker = UsageTracker.getInstance();
  const gemini = getGeminiClient();

  const attempt = async () => {
    await tracker.waitIfNeeded();
    tracker.recordRequest();
    const result = await withTimeout(
      gemini.models.generateContent({
        model: GENERATIVE_MODEL,
        contents,
        config,
      }),
      timeoutMs
    );

    return result;
  };

  try {
    const response = await retryWithBackoff(attempt, { maxRetries, tier });
    return response.text?.trim() ?? null;
  } catch (err) {
    console.error(
      `[robustGenerate] Model ${GENERATIVE_MODEL} failed after retries. Error:`,
      err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err
    );

    if (fallbackModel) {
      console.warn(`[robustGenerate] Falling back to ${fallbackModel}`);
      try {
        await tracker.waitIfNeeded();
        tracker.recordRequest();
        const fallbackResponse = await withTimeout(
          gemini.models.generateContent({
            model: fallbackModel,
            contents,
            config,
          }),
          timeoutMs * 1.5
        );
        tracker.recordRequest();
        return fallbackResponse.text?.trim() ?? null;
      } catch (fallbackErr) {
        console.error(
          `[robustGenerate] Fallback model ${fallbackModel} also failed:`,
          fallbackErr
        );
      }
    }

    return fallbackContent ?? null;
  }
}
