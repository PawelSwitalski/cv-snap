import type { LanguageCode } from "@cv-snap/shared";
import type { AdInput } from "@/features/tailoring/requirements-resolution";
import type { HistoryEntry } from "./history-entry";
import type { HistoryRepository } from "./history-repository";
import { putEntry, type CapturedSnapshot } from "./record-download";

/** Same cap as the requirements' title (shared `LIMITS.shortChars` is larger; a title is short). */
export const MAX_OWN_TITLE_CHARS = 200;

/** The file name of a stored CV kept as a plain `Blob` (no name). */
export const DEFAULT_OWN_CV_NAME = "cv.pdf";

/** A captured ad ready to be saved with the user's own CV: no host was involved. */
export interface OwnCvAd {
  ad: AdInput;
  adKey: string;
  snapshot: CapturedSnapshot;
  /** `document.title` of the page; prefills the job title when there is no JSON-LD. */
  pageTitle: string | null;
}

export interface OwnCvInput {
  ad: OwnCvAd;
  pdf: Blob;
  fileName: string;
  title: string;
  /** Empty means unknown: History then shows the ad's site. */
  company: string;
  /** No AI says which language the CV is in; the panel's language stands in for it. */
  language: LanguageCode;
  now: Date;
}

/**
 * Job title and company for the save form (story 002-save-own-cv): JSON-LD when the page has a
 * `JobPosting`, otherwise the page title and no company. Both stay editable.
 */
export function ownCvDefaults(ad: OwnCvAd): { title: string; company: string } {
  const fields = ad.ad.structuredFields;
  const title = fields?.title ?? ad.pageTitle ?? "";
  return {
    title: title.replace(/\s+/g, " ").trim().slice(0, MAX_OWN_TITLE_CHARS),
    company: fields?.company ?? "",
  };
}

/** The name to save a stored CV under: its own file name when the browser kept it. */
export function storedCvName(file: Blob): string {
  return file instanceof File && file.name.trim() !== "" ? file.name : DEFAULT_OWN_CV_NAME;
}

/**
 * Saves the user's own CV for an ad (story 002-save-own-cv): one entry per ad, as for Download PDF.
 * Everything here is local; nothing goes to the host or to Claude.
 */
export async function recordOwnCv(
  history: HistoryRepository,
  { ad, pdf, fileName, title, company, language, now }: OwnCvInput,
): Promise<HistoryEntry> {
  const existing = await history.get(ad.adKey);
  const trimmedCompany = company.trim();
  return putEntry(history, existing, {
    adKey: ad.adKey,
    title: title.trim().slice(0, MAX_OWN_TITLE_CHARS),
    company: trimmedCompany === "" ? null : trimmedCompany.slice(0, MAX_OWN_TITLE_CHARS),
    url: ad.ad.url,
    isManualSelection: ad.ad.isManualSelection,
    outputLanguage: language,
    fileName,
    source: "own",
    pdf,
    adText: ad.ad.text,
    snapshot: ad.snapshot,
    now,
  });
}
