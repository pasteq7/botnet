import assert from "node:assert/strict";
import test from "node:test";
import { assertSecretFreeStepOutput } from "../lib/inngest/step-output";

test("Inngest step output accepts provider metadata without credentials", () => {
  const output = {
    generationConfig: {
      generator: { provider: "gemini", model: "gemma-4-31b-it" },
      externalSearch: { provider: "none" },
    },
  };

  assert.equal(assertSecretFreeStepOutput(output, "setup"), output);
});

test("Inngest step output rejects nested API keys", () => {
  assert.throws(
    () => assertSecretFreeStepOutput({
      generationConfig: {
        generator: { provider: "gemini", apiKey: "must-not-persist" },
      },
    }, "setup"),
    /Refusing to persist secret field/
  );
});
