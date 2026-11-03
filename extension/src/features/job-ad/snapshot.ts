/**
 * Cleaned snapshot of the job-ad page (story 003-page-snapshot), taken in the content script when
 * the ad is captured. The page HTML is parsed into a new, inert document (`DOMParser` runs no
 * scripts and loads nothing), cleaned, and serialised. Cleaning makes the copy readable offline
 * and small; the viewer's sandboxed iframe (story 004) is the second layer that keeps any page
 * code from running even if something slips through.
 */

/** Larger cleaned snapshots aren't saved (FR-2); the entry keeps the ad text only. */
export const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024;

/** First element of the snapshot's `<head>`: no scripts, plugins, frames, `<base>` or forms. */
export const SNAPSHOT_CSP =
  "default-src * data: blob:; script-src 'none'; object-src 'none'; frame-src 'none'; " +
  "base-uri 'none'; form-action 'none'";

export type PageSnapshot =
  { status: "saved"; html: string } | { status: "too-large" } | { status: "none" };

const REMOVED_ELEMENTS = [
  "script",
  "noscript",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "base",
  "portal",
  "meta[http-equiv]",
].join(",");

/** `<link>` relations kept: styling and icons. Preload, prefetch, import etc. are dropped. */
const KEPT_LINK_RELS = new Set(["stylesheet", "icon", "shortcut", "apple-touch-icon"]);

const URL_ATTRIBUTES = ["href", "src", "poster", "cite", "background"] as const;
const DROPPED_ATTRIBUTES = new Set(["srcdoc", "action", "formaction", "ping", "integrity"]);

/** `javascript:`, `vbscript:` and HTML/script `data:` URLs (whitespace and case tricks included). */
const DANGEROUS_URL =
  /^\s*(?:j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t|v\s*b\s*s\s*c\s*r\s*i\s*p\s*t)\s*:|^\s*data\s*:\s*(?:text\/html|application\/(?:x?html|javascript)|text\/javascript|image\/svg)/i;

function absolute(value: string, baseUrl: string): string | null {
  if (DANGEROUS_URL.test(value)) return null;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

const CSS_URL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;

function absoluteCss(css: string, baseUrl: string): string {
  return css.replace(CSS_URL, (whole, quote: string, url: string) => {
    const resolved = absolute(url, baseUrl);
    return resolved === null ? "url()" : `url(${quote}${resolved}${quote})`;
  });
}

function absoluteSrcset(srcset: string, baseUrl: string): string {
  return srcset
    .split(",")
    .map((candidate) => {
      const [url, ...descriptor] = candidate.trim().split(/\s+/);
      const resolved = url ? absolute(url, baseUrl) : null;
      return resolved === null ? "" : [resolved, ...descriptor].join(" ");
    })
    .filter(Boolean)
    .join(", ");
}

function cleanElement(element: Element, baseUrl: string): void {
  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();
    if (name.startsWith("on") || DROPPED_ATTRIBUTES.has(name)) {
      element.removeAttribute(attribute.name);
    } else if (name === "style") {
      element.setAttribute(attribute.name, absoluteCss(attribute.value, baseUrl));
    } else if (name === "srcset") {
      element.setAttribute(attribute.name, absoluteSrcset(attribute.value, baseUrl));
    } else if ((URL_ATTRIBUTES as readonly string[]).includes(name) || name.endsWith(":href")) {
      const resolved = absolute(attribute.value, baseUrl);
      if (resolved === null) element.removeAttribute(attribute.name);
      else element.setAttribute(attribute.name, resolved);
    }
  }
  if (element.localName === "a" && element.hasAttribute("href")) {
    element.setAttribute("target", "_blank");
    element.setAttribute("rel", "noopener noreferrer");
  }
}

/** The cleaned document as HTML (no size check). Exported for tests. */
export function cleanPageHtml(html: string, pageUrl: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const element of doc.querySelectorAll(REMOVED_ELEMENTS)) element.remove();
  for (const link of doc.querySelectorAll("link")) {
    const rels = (link.getAttribute("rel") ?? "").toLowerCase().split(/\s+/);
    if (!rels.some((rel) => KEPT_LINK_RELS.has(rel))) link.remove();
  }
  // SVG can carry script and event handlers too; foreignObject can embed HTML.
  for (const element of doc.querySelectorAll("svg script, svg foreignObject")) element.remove();
  for (const element of doc.querySelectorAll("*")) cleanElement(element, pageUrl);
  for (const style of doc.querySelectorAll("style")) {
    style.textContent = absoluteCss(style.textContent, pageUrl);
  }

  const csp = doc.createElement("meta");
  csp.setAttribute("http-equiv", "Content-Security-Policy");
  csp.setAttribute("content", SNAPSHOT_CSP);
  doc.head.prepend(csp);
  if (!doc.querySelector("meta[charset]")) {
    const charset = doc.createElement("meta");
    charset.setAttribute("charset", "utf-8");
    doc.head.prepend(charset);
  }
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

/** Snapshot of a page for the history (FR-2); never throws, capture must not fail because of it. */
export function snapshotPage(html: string, pageUrl: string): PageSnapshot {
  try {
    const cleaned = cleanPageHtml(html, pageUrl);
    if (new TextEncoder().encode(cleaned).byteLength > MAX_SNAPSHOT_BYTES) {
      return { status: "too-large" };
    }
    return { status: "saved", html: cleaned };
  } catch {
    return { status: "none" };
  }
}
