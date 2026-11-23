import test from "node:test";
import assert from "node:assert/strict";
import { readApiError } from "../src/lib/api.ts";

const res = (body: string, status: number) => new Response(body, { status });

test("uses the server's JSON error message", async () => {
  assert.equal(await readApiError(res(JSON.stringify({ error: "Invalid API Key" }), 400), "Failed."), "Invalid API Key");
});

test("HTML error page does not leak a JSON parse error", async () => {
  const msg = await readApiError(res("<html>Bad gateway</html>", 502), "Failed to generate scenes.");
  assert.match(msg, /Failed to generate scenes\./);
  assert.doesNotMatch(msg, /Unexpected token/);
});

test("413 gets a friendly size message", async () => {
  assert.match(await readApiError(res("", 413), "x"), /too large/i);
});

test("empty body falls back", async () => {
  assert.equal(await readApiError(res("", 400), "Fallback."), "Fallback.");
});
