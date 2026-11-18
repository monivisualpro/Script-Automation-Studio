export function extractGoogleDriveFileId(input: string): string | null {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;

  // Accept direct file IDs only if clearly valid alphanumeric Drive ID format
  if (/^[a-zA-Z0-9_-]{20,80}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (
      host !== "drive.google.com" &&
      host !== "docs.google.com" &&
      !host.endsWith(".googleusercontent.com")
    ) {
      return null;
    }

    // Matches /file/d/<ID>/view or /d/<ID>/
    const pathMatch = parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]{10,80})/);
    if (pathMatch?.[1]) return pathMatch[1];

    // Matches ?id=<ID>
    const idParam = parsed.searchParams.get("id");
    if (idParam && /^[a-zA-Z0-9_-]{10,80}$/.test(idParam)) {
      return idParam;
    }
  } catch {
    return null;
  }

  return null;
}

export function getPublicDriveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;
}
