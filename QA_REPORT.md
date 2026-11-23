
## Round 3 - "chat workspace generates nothing"
**Root cause:** `/api/chat/stream` aborted the generation on `req.on("close")`. Since Node 16 that event fires as soon as the
request body has been read, so every reply was cancelled before the first token; the route then ended the response with no
error, and the UI showed an empty bubble. Fixed with `res.on("close")` (regression test in `tests/chatStream.test.ts`).

Also fixed:
- Empty replies (stream closed early, model returned nothing, reasoning-only output) now show a clear error, never a blank bubble.
- Local engine: shared SSE parser (CRLF, last line, `reasoning_content`), real error shown when the auto-started engine rejects the request.
- Chat data loss: auto-save no longer turns on after a failed load (it overwrote saved chats with an empty state); disk writes are
  atomic (temp + rename) with rolling `.bak` and a `.before-empty.bak` safety copy; corrupt files are preserved as `.corrupt-<time>`.
- Prompt Optimizer and stream errors show the server's real message.
- 56 more buttons now have screen-reader labels (taken from their existing `title`); CI/lockfile, `.env.example`, `.gitignore` restored.

## Round 4 - deeper scan of the uploaded code
- OpenAI / Claude streaming: errors that arrive *after* the 200 response started (overloaded, rate limit) were silently
  swallowed, producing cut-off or empty answers. Now thrown and shown to the user. All providers share one tested SSE parser
  (`server/sseStream.ts`: CRLF, chunk-split events, final line without newline, reasoning-only output) - `tests/sseStream.test.ts`.
- Note: with the localhost guard on (default), opening the app through a custom host name or LAN IP is refused; set `HOST=0.0.0.0`
  deliberately if you want that.
- Reviewed with no change needed: file-size limits in `/api/parse-file`, local-skills file caps, Claude message merging.
