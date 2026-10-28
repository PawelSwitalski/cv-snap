import {
  LIMITS,
  MAX_STRUCTURED_DESCRIPTION_CHARS,
  StructuredAdFieldsSchema,
  type StructuredAdFields,
} from "@cv-snap/shared";
import { textFromElement } from "./text-from-html";

/** Deepest nesting searched for a `JobPosting` (JSON-LD is page data, so bounded). */
const MAX_DEPTH = 6;

/**
 * The first schema.org `JobPosting` in the page's JSON-LD blocks (object, array or `@graph`), or
 * null. Invalid JSON is ignored. The result is untrusted page data.
 */
export function findJobPosting(document: Document): Record<string, unknown> | null {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    let data: unknown;
    try {
      data = JSON.parse(script.textContent);
    } catch {
      continue;
    }
    const found = searchJobPosting(data, 0);
    if (found) return found;
  }
  return null;
}

function searchJobPosting(value: unknown, depth: number): Record<string, unknown> | null {
  if (depth > MAX_DEPTH || typeof value !== "object" || value === null) return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = searchJobPosting(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  if (isJobPostingType(record["@type"])) return record;
  return searchJobPosting(record["@graph"], depth + 1);
}

function isJobPostingType(type: unknown): boolean {
  if (typeof type === "string") return type === "JobPosting";
  return Array.isArray(type) && type.includes("JobPosting");
}

/**
 * JSON-LD seed fields for requirements parsing (story 004): title, hiring organisation and the
 * description as plain text, each capped to the shared contract's limits. Null without a
 * `JobPosting`.
 */
export function structuredFieldsFrom(document: Document): StructuredAdFields | null {
  const posting = findJobPosting(document);
  if (!posting) return null;
  const organization = posting.hiringOrganization;
  const company =
    typeof organization === "string"
      ? organization
      : typeof organization === "object" && organization !== null
        ? (organization as Record<string, unknown>).name
        : null;
  const fields = {
    title: shortText(posting.title),
    company: shortText(company),
    description: htmlToPlainText(posting.description, MAX_STRUCTURED_DESCRIPTION_CHARS),
  };
  const parsed = StructuredAdFieldsSchema.safeParse(fields);
  return parsed.success ? parsed.data : null;
}

function shortText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 0 ? text.slice(0, LIMITS.shortChars) : null;
}

/** JSON-LD descriptions are often HTML; parse inertly (no scripts run) and keep the text. */
function htmlToPlainText(value: unknown, maxChars: number): string | null {
  if (typeof value !== "string") return null;
  const parsed = new DOMParser().parseFromString(value, "text/html");
  const text = textFromElement(parsed.body);
  return text.length > 0 ? text.slice(0, maxChars) : null;
}
