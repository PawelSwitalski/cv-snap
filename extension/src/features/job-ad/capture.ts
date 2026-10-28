import { scoreJobAd } from "./detect";
import { capText, extractAd } from "./extract";
import { structuredFieldsFrom } from "./json-ld";
import { MIN_SELECTION_CHARS, type CaptureResult } from "./messages";
import type { VisibilityProbe } from "./visible-content";

export interface CaptureInput {
  document: Document;
  url: string;
  /** `Selection.toString()`: keeps line breaks across elements. */
  selectionText: string | null;
  probe?: VisibilityProbe;
}

/**
 * What Generate uses (stories 004 and 005): a selection of ≥ 200 characters wins over automatic
 * extraction; a shorter selection is rejected; without a selection the detected ad is extracted;
 * otherwise `JOB_AD_NOT_DETECTED` with the "select the ad text" hint.
 */
export function captureAd({ document, url, selectionText, probe }: CaptureInput): CaptureResult {
  const selection = selectionText?.replace(/\r\n/g, "\n").trim() ?? "";
  if (selection.length > 0) {
    if (selection.length < MIN_SELECTION_CHARS) {
      return { ok: false, reason: "SELECTION_TOO_SHORT", hint: "SELECT_AD_TEXT" };
    }
    return {
      ok: true,
      ad: { text: capText(selection), url, structuredFields: null, isManualSelection: true },
    };
  }

  if (scoreJobAd({ url, document }).isJobAd) {
    const structuredFields = structuredFieldsFrom(document);
    const extracted = extractAd(document, probe, structuredFields?.description);
    if (extracted) {
      return {
        ok: true,
        ad: { text: extracted.text, url, structuredFields, isManualSelection: false },
      };
    }
  }
  return { ok: false, reason: "JOB_AD_NOT_DETECTED", hint: "SELECT_AD_TEXT" };
}
