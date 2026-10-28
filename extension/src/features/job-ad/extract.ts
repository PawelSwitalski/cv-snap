import { MAX_AD_CHARS, TRUNCATION_MARKER } from "@cv-snap/shared";
import { Readability } from "@mozilla/readability";
import { textFromElement } from "./text-from-html";
import { cloneWithoutHidden, type VisibilityProbe } from "./visible-content";

/** Below this, Readability's result is treated as a miss and the page's main content is used. */
const MIN_READABLE_CHARS = 200;

export interface ExtractedAd {
  text: string;
  title: string | null;
}

/**
 * A requirements section (PL/EN/DE): what the CV is matched against. Readability often keeps only one
 * block of an ad whose sections sit in sibling containers and drops the requirements (17 of 22 real
 * pages in the test report); the text that keeps them is preferred.
 */
const REQUIREMENTS_HINT = /wymagan|oczekuj|requirements|your profile|anforderung|ihr profil/i;

/**
 * The ad's readable text (story 004), title first, capped at 50,000 characters with a visible
 * marker; null when the page has no text at all. Untrusted. The body is, in order of preference:
 * 1. the JSON-LD `JobPosting` description (the publisher's full ad text, already sent as
 *    `structuredFields`; it had the requirements on every real test page);
 * 2. Readability's article, when it contains a requirements section;
 * 3. the visible `<main>`/`<article>` text, else the whole visible `<body>`, when only it has one;
 * 4. otherwise Readability (≥ 200 characters) or the visible page text.
 * Hidden elements are removed from a clone first (prompt-injection defence); the page is untouched.
 */
export function extractAd(
  document: Document,
  probe?: VisibilityProbe,
  structuredDescription?: string | null,
): ExtractedAd | null {
  const clone = cloneWithoutHidden(document, probe);
  const mainRoot = clone.querySelector("main, article");
  const fallbacks = [mainRoot, clone.body]
    .filter((root): root is HTMLElement => root !== null)
    .map((root) => textFromElement(root));

  // Readability rewrites the document it's given, so it gets its own copy.
  const article = new Readability(clone.cloneNode(true) as Document).parse();
  const readableText = article?.content ? textFromHtml(clone, article.content) : "";
  const body = chooseBody(readableText, fallbacks, structuredDescription ?? null);
  if (body.length === 0) return null;

  const title = clean(article?.title) ?? clean(document.title);
  const text = title && !body.startsWith(title) ? `${title}\n\n${body}` : body;
  return { text: capText(text), title };
}

/** `fallbacks`: visible `<main>`/`<article>` text (if any), then the whole visible `<body>`. */
function chooseBody(
  readableText: string,
  fallbacks: string[],
  structuredDescription: string | null,
): string {
  if (structuredDescription && structuredDescription.length >= MIN_READABLE_CHARS) {
    return structuredDescription;
  }
  const isReadable = readableText.length >= MIN_READABLE_CHARS;
  if (isReadable && REQUIREMENTS_HINT.test(readableText)) return readableText;
  const withRequirements = fallbacks.find((text) => REQUIREMENTS_HINT.test(text));
  if (withRequirements) return withRequirements;
  return isReadable ? readableText : (fallbacks[0] ?? "");
}

function textFromHtml(document: Document, html: string): string {
  // Readability's output is sanitised HTML; parse it inertly into a detached element.
  const container = document.createElement("div");
  const parsed = new DOMParser().parseFromString(html, "text/html");
  for (const child of [...parsed.body.childNodes])
    container.append(document.importNode(child, true));
  return textFromElement(container);
}

function clean(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  return text.length > 0 ? text : null;
}

/** 50,000 characters (FR-7), then a visible marker so the parser knows text is missing. */
export function capText(text: string): string {
  return text.length <= MAX_AD_CHARS
    ? text
    : `${text.slice(0, MAX_AD_CHARS)}\n${TRUNCATION_MARKER}`;
}
