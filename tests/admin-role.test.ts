import assert from "node:assert/strict";
import test from "node:test";
import { hasAdminRole } from "../lib/auth/admin-role";

test("admin role accepts a scalar app_metadata role", () => {
  assert.equal(hasAdminRole({ app_metadata: { role: "admin" } }), true);
});

test("admin role accepts app_metadata roles array", () => {
  assert.equal(hasAdminRole({ app_metadata: { roles: ["editor", "admin"] } }), true);
});

test("admin role rejects ordinary authenticated users", () => {
  assert.equal(hasAdminRole({ app_metadata: { role: "user", roles: ["editor"] } }), false);
  assert.equal(hasAdminRole(null), false);
});
