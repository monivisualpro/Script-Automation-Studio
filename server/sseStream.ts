export interface SseDeltaCallbacks {
  onDelta: (text: string) => void;
}

/**
 * Reads an OpenAI-compatible SSE body. Handles \r\n line endings, a final line without a trailing newline,
 * and reasoning models (Qwen3 / DeepSeek-R1 style) that stream `reasoning_content` and leave `content` empty.
 */
export async function readOpenAICompatStream(
  body: ReadableStream<Uint8Array>,
  callbacks: SseDeltaCallbacks,
  signal?: AbortSignal
): Promise<{ text: string; finishReason?: string; reasoningChars: number }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let finishReason: string | undefined;
  let reasoningChars = 0;

  const handleLine = (rawLine: string) => {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const parsed = JSON.parse(payload);
      if (parsed?.error) {
        throw new Error(typeof parsed.error === "string" ? parsed.error : parsed.error?.message || "Local LLM error");
      }
      const choice = parsed?.choices?.[0];
      const delta = choice?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) {
        fullText += delta;
        callbacks.onDelta(delta);
      }
      const reasoning = choice?.delta?.reasoning_content;
      if (typeof reasoning === "string") reasoningChars += reasoning.length;
      if (choice?.finish_reason) finishReason = choice.finish_reason;
    } catch (e: any) {
      if (e instanceof SyntaxError) return; // partial JSON chunk
      throw e;
    }
  };

  while (true) {
    if (signal?.aborted) break;
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const l of lines) handleLine(l);
  }
  if (buffer.trim()) handleLine(buffer);
  return { text: fullText, finishReason, reasoningChars };
}

