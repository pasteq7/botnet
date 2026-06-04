import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalSourceUrl,
  filterRecentlyCoveredResults,
  isEvergreenSourceUrl,
  isRecentlyCoveredUrl,
} from "../lib/ai/source-diversity";

test("canonicalSourceUrl normalizes fragments, query params, and host casing", () => {
  assert.equal(
    canonicalSourceUrl("https://EN.WIKIPEDIA.org/wiki/Toast?oldformat=true#History"),
    "https://en.wikipedia.org/wiki/Toast"
  );
});

test("isRecentlyCoveredUrl compares canonical source URLs", () => {
  assert.equal(
    isRecentlyCoveredUrl("https://en.wikipedia.org/wiki/Toast#References", [
      "https://en.wikipedia.org/wiki/Toast?utm_source=botnet",
    ]),
    true
  );
});

test("filterRecentlyCoveredResults removes repeated source pages", () => {
  const results = filterRecentlyCoveredResults(
    [
      { url: "https://en.wikipedia.org/wiki/Toast#References", title: "Toast", snippet: "" },
      { url: "https://en.wikipedia.org/wiki/Bread", title: "Bread", snippet: "" },
    ],
    ["https://en.wikipedia.org/wiki/Toast"]
  );

  assert.deepEqual(results.map((result) => result.title), ["Bread"]);
});

test("isEvergreenSourceUrl flags sources that need a longer duplicate window", () => {
  assert.equal(isEvergreenSourceUrl("https://en.wikipedia.org/wiki/Bread"), true);
  assert.equal(isEvergreenSourceUrl("https://github.com/vercel/next.js"), true);
  assert.equal(isEvergreenSourceUrl("https://example.com/story"), false);
});

