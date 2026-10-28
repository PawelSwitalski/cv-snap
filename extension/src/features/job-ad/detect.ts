import type { PresetId } from "@/features/allowed-sites/presets";
import { findJobPosting } from "./json-ld";
import { JOB_AD_URL_PATTERNS, matchJobAdUrl } from "./url-patterns";

/**
 * Job-ad detection (story 003, FR-7). Strongest signals first: a JSON-LD `JobPosting` or a preset
 * job-ad URL always detects; otherwise PL/EN/DE keyword points must reach the threshold, with a
 * penalty for listing/search pages that repeat ad links or apply buttons.
 */

/** Initial value; tuned on fixtures in the test stage (threshold table in the test report). */
export const KEYWORD_THRESHOLD = 6;

const LISTING_PENALTY = 6;
/**
 * Distinct job-ad links on one page that indicate a listing/search page. Tuned on real pages (test
 * report): single ads link up to 14 "similar offers" (justjoin.it); result pages show 15+.
 */
export const LISTING_MIN_AD_LINKS = 15;
/**
 * Apply buttons on one page that indicate a listing page. Tuned on real pages: single ads repeat
 * their button up to 5 times (header, sticky bar, mobile, footer).
 */
export const LISTING_MIN_APPLY_BUTTONS = 8;

interface KeywordGroup {
  id: string;
  points: number;
  pattern: RegExp;
}

const APPLY_BUTTON =
  /^(?:apply(?: now)?|apply for this job|easy apply|quick apply|aplikuj(?: teraz| szybko)?|jetzt bewerben|bewerben)$/i;

/** Section headings; each group counts once. */
const HEADING_GROUPS: readonly KeywordGroup[] = [
  {
    id: "requirements",
    points: 2,
    pattern:
      /\b(?:requirements|wymagania|nasze wymagania|anforderungen|your profile|ihr profil)\b/i,
  },
  {
    id: "responsibilities",
    points: 2,
    pattern:
      /\b(?:responsibilities|your tasks|obowiązki|zakres obowiązków|twój zakres obowiązków|ihre aufgaben|aufgaben)\b/i,
  },
  {
    id: "offer",
    points: 1,
    pattern: /\b(?:we offer|benefits|oferujemy|to oferujemy|wir bieten|benefity)\b/i,
  },
  {
    id: "salary",
    points: 1,
    pattern: /\b(?:salary|wynagrodzenie|widełki|gehalt)\b/i,
  },
];

const APPLY_POINTS = 3;
const HEADING_SELECTOR = "h1, h2, h3, h4, dt, strong, b";
const BUTTON_SELECTOR = 'button, a, input[type="submit"], input[type="button"]';

export type DetectionSignal =
  | { kind: "json-ld" }
  | { kind: "url-pattern"; presetId: PresetId }
  | { kind: "keyword"; id: string; points: number }
  | { kind: "listing-guard"; points: number };

export interface Detection {
  score: number;
  isJobAd: boolean;
  signals: DetectionSignal[];
}

export function scoreJobAd({ url, document }: { url: string; document: Document }): Detection {
  const signals: DetectionSignal[] = [];
  if (findJobPosting(document)) signals.push({ kind: "json-ld" });
  const presetId = matchJobAdUrl(url);
  if (presetId) signals.push({ kind: "url-pattern", presetId });

  const applyButtons = countApplyButtons(document);
  if (applyButtons > 0) signals.push({ kind: "keyword", id: "apply", points: APPLY_POINTS });
  const headings = [...document.querySelectorAll(HEADING_SELECTOR)].map((element) =>
    normalize(element.textContent),
  );
  for (const group of HEADING_GROUPS) {
    if (headings.some((heading) => heading.length <= 80 && group.pattern.test(heading))) {
      signals.push({ kind: "keyword", id: group.id, points: group.points });
    }
  }
  if (
    countDistinctAdLinks(document) >= LISTING_MIN_AD_LINKS ||
    applyButtons >= LISTING_MIN_APPLY_BUTTONS
  ) {
    signals.push({ kind: "listing-guard", points: -LISTING_PENALTY });
  }

  const score = signals.reduce(
    (sum, signal) =>
      signal.kind === "keyword" || signal.kind === "listing-guard" ? sum + signal.points : sum,
    0,
  );
  const isHardDetected = signals.some(
    (signal) => signal.kind === "json-ld" || signal.kind === "url-pattern",
  );
  return { score, isJobAd: isHardDetected || score >= KEYWORD_THRESHOLD, signals };
}

function countApplyButtons(document: Document): number {
  let count = 0;
  for (const element of document.querySelectorAll(BUTTON_SELECTOR)) {
    const label =
      element instanceof HTMLInputElement ? element.value : normalize(element.textContent);
    if (APPLY_BUTTON.test(label)) count++;
  }
  return count;
}

function countDistinctAdLinks(document: Document): number {
  const patterns = Object.values(JOB_AD_URL_PATTERNS);
  const links = new Set<string>();
  for (const anchor of document.querySelectorAll("a[href]")) {
    const href = (anchor as HTMLAnchorElement).href.split("#")[0] ?? "";
    if (patterns.some((pattern) => pattern.test(href))) links.add(href);
  }
  return links.size;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
