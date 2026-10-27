/**
 * Identity of a job ad for the requirements cache (story 004, ddd-01 "AdKey"): the same ad seen
 * through different tracking links maps to one key; a manual selection gets its own key.
 */
export type AdKey = string;

/** Query parameters that only track the visit and don't change which ad is shown. */
const TRACKING_PARAMS = new Set(["trk", "fbclid", "gclid", "refid", "trackingid"]);
const isTrackingParam = (name: string) => {
  const lower = name.toLowerCase();
  return lower.startsWith("utm_") || TRACKING_PARAMS.has(lower);
};

/** Lower-case host, no fragment, tracking parameters removed, remaining parameters sorted. */
export function normalizeAdUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return url.trim();
  }
  parsed.hash = "";
  const kept = [...parsed.searchParams.entries()]
    .filter(([name]) => !isTrackingParam(name))
    .sort(([a, aValue], [b, bValue]) => a.localeCompare(b) || aValue.localeCompare(bValue));
  parsed.search = new URLSearchParams(kept).toString();
  return parsed.toString();
}

/**
 * Cache key for an ad. With `selectedText` (manual selection, FR-8) the key also carries the
 * first 16 hex digits of the SHA-256 of the normalised selection, so different selections on one
 * page don't share an entry. The text itself never becomes part of the key.
 */
export async function adKeyFor(url: string | null, selectedText?: string): Promise<AdKey> {
  const base = url ? normalizeAdUrl(url) : "";
  if (selectedText === undefined) return base;
  const normalized = selectedText.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  return base ? `${base}#sel:${hex}` : `sel:${hex}`;
}
