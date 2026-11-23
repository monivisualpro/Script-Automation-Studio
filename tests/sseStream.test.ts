import test from "node:test";
import assert from "node:assert/strict";
import { readOpenAICompatStream } from "../server/sseStream.ts";

const enc = new TextEncoder();
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
}
const delta = (t: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;

async function run(chunks: string[]) {
  const got: string[] = [];
  const r = await readOpenAICompatStream(streamOf(chunks), { onDelta: (t) => got.push(t) });
  return { ...r, got };
}

test("reads normal deltas and finish reason", async () => {
  const r = await run([delta("Hel"), delta("lo"), `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n\n`, "data: [DONE]\n\n"]);
  assert.equal(r.text, "Hello");
  assert.deepEqual(r.got, ["Hel", "lo"]);
  assert.equal(r.finishReason, "stop");
});

test("handles CRLF line endings", async () => {
  const r = await run([delta("A").replace(/\n/g, "\r\n"), delta("B").replace(/\n/g, "\r\n")]);
  assert.equal(r.text, "AB");
});

test("handles an event split across network chunks", async () => {
  const full = delta("split-me");
  const r = await run([full.slice(0, 15), full.slice(15, 40), full.slice(40)]);
  assert.equal(r.text, "split-me");
});

test("flushes a final line that has no trailing newline", async () => {
  const r = await run([delta("x"), delta("tail").trimEnd()]);
  assert.equal(r.text, "xtail");
});

test("a mid-stream provider error is thrown, not swallowed", async () => {
  await assert.rejects(
    run([delta("partial"), `data: ${JSON.stringify({ error: { message: "Overloaded" } })}\n\n`]),
    /Overloaded/
  );
});

test("counts hidden reasoning tokens so callers can explain an empty answer", async () => {
  const reasoning = `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "thinking..." } }] })}\n\n`;
  const r = await run([reasoning, reasoning, "data: [DONE]\n\n"]);
  assert.equal(r.text, "");
  assert.ok(r.reasoningChars > 0);
});

test("garbage / partial JSON lines are ignored", async () => {
  const r = await run(["data: {not json\n\n", delta("ok")]);
  assert.equal(r.text, "ok");
});
