/**
 * Match patterns for allowed sites. cv-snap only reads HTTPS pages; patterns are
 * `https://<host>/*` or `https://*.<domain>/*` (subdomains included).
 */

export type SitePatternResult =
  | { ok: true; pattern: string; host: string }
  | { ok: false; reason: "UNSUPPORTED_SCHEME" | "INVALID_URL" };

/** "Add this site": the current tab's URL → its origin pattern (story 001 edge case: http-only). */
export function sitePatternForUrl(url: string): SitePatternResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "INVALID_URL" };
  }
  if (parsed.protocol !== "https:" || !parsed.hostname) {
    return { ok: false, reason: "UNSUPPORTED_SCHEME" };
  }
  const host = parsed.hostname.toLowerCase();
  return { ok: true, pattern: `https://${host}/*`, host };
}

/** Whether a URL is covered by an `https://host/*` or `https://*.domain/*` pattern. */
export function patternMatchesUrl(pattern: string, url: string): boolean {
  const match = /^https:\/\/(\*\.)?([^/*]+)\/\*$/.exec(pattern);
  if (!match) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  const domain = (match[2] ?? "").toLowerCase();
  return match[1] ? host === domain || host.endsWith(`.${domain}`) : host === domain;
}

/** Human-readable label for a pattern without preset metadata, e.g. `*.example.com`. */
export function labelForPattern(pattern: string): string {
  return pattern.replace(/^https:\/\//, "").replace(/\/\*$/, "");
}

/** Only HTTPS site patterns count as allowed sites (ignores e.g. the broad optional `https://*\/*`). */
export function isSitePattern(pattern: string): boolean {
  return /^https:\/\/(\*\.)?[^/*]+\/\*$/.test(pattern);
}
