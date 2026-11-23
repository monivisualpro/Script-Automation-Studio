import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";

test("server never aborts generation from req 'close' (fires right after the body is read)", () => {
  const raw = fs.readFileSync(new URL("../server.ts", import.meta.url), "utf8");
  // ignore comments (the fix is explained in one)
  const src = raw.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.equal(/req\.on\(\s*["']close["']/.test(src), false, "use res.on('close') to detect a client disconnect");
  assert.match(src, /res\.on\(\s*"close"/);
});

test("res 'close' (not req 'close') is the right disconnect signal for a streaming reply", async () => {
  const events: string[] = [];
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("close", () => events.push(`req-close(resEnded=${res.writableEnded})`));
    res.on("close", () => events.push(`res-close(resEnded=${res.writableEnded})`));
    setTimeout(() => res.end("ok"), 100);
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as any).port;
  await new Promise<void>((resolve) => {
    const r = http.request({ port, method: "POST" }, (resp) => {
      resp.resume();
      resp.on("end", () => resolve());
    });
    r.end("{}");
  });
  server.close();
  // req 'close' happens while the response is still being produced -> would abort the AI call.
  assert.ok(events[0].startsWith("req-close(resEnded=false)"), events.join(","));
  // res 'close' only happens once the response finished.
  assert.ok(events.includes("res-close(resEnded=true)"), events.join(","));
});
