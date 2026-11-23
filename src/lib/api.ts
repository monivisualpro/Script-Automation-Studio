/**
 * Turns a failed fetch Response into a useful Error message.
 *
 * The server always answers failures with `{ error: string }`, but a proxy, a body-size limit or a crash can
 * return HTML/plain text instead. Calling `res.json()` blindly then shows users
 * "Unexpected token '<'" and hides the real reason (bad API key, quota, model unavailable...).
 */
export async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
      } catch {
        // not JSON
      }
    }
  } catch {
    // body unreadable
  }
  if (res.status === 413) return "The request is too large. Try a shorter script or a smaller file.";
  if (res.status === 404) return `${fallback} (server endpoint not found - restart the app).`;
  if (res.status >= 500) return `${fallback} (server error ${res.status}).`;
  return fallback;
}

/** Clipboard write that also works on non-secure (http://LAN) origins and never throws. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
