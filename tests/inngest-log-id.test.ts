import assert from "node:assert/strict";
import test from "node:test";
import { createCommunityGenerateEvent, createCommunityGenerateEvents } from "../lib/inngest/log-id";

test("community generation event uses one app log id as event id and payload logId", () => {
  const event = createCommunityGenerateEvent(
    { id: "community-1", slug: "general" },
    () => "log-1"
  );

  assert.deepEqual(event, {
    id: "log-1",
    name: "botnet/community.generate",
    data: {
      communityId: "community-1",
      communitySlug: "general",
      logId: "log-1",
    },
  });
});

test("cron fan-out event creation returns stable log ids when called by a memoized step", () => {
  const ids = ["log-1", "log-2"];
  const events = createCommunityGenerateEvents(
    [
      { id: "community-1", slug: "general" },
      { id: "community-2", slug: "science" },
    ],
    () => ids.shift() ?? "unexpected"
  );

  assert.deepEqual(events.map((event) => event.id), ["log-1", "log-2"]);
  assert.deepEqual(events.map((event) => event.data.logId), ["log-1", "log-2"]);
});
