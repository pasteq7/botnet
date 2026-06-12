import assert from "node:assert/strict";
import test from "node:test";
import { formatProviderError } from "../lib/ai/provider-errors";
import { isRetryableError } from "../lib/ai/reliability";

test("Gemini JSON errors retain provider code and status", () => {
  const error = formatProviderError(
    "Gemini",
    '{"error":{"code":500,"message":"Internal error encountered.","status":"INTERNAL"}}'
  );

  assert.equal(error, "Gemini API error 500 (INTERNAL): Internal error encountered.");
  assert.equal(isRetryableError(error), true);
});

test("provider 503 errors remain retryable after formatting", () => {
  const error = formatProviderError(
    "Gemini",
    '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}'
  );

  assert.match(error, /503 \(UNAVAILABLE\)/);
  assert.equal(isRetryableError(error), true);
});
