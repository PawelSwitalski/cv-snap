import type { PresetId } from "@/features/allowed-sites/presets";

/**
 * Job-ad page URLs per preset board (FR-7 signal 2). A match always counts as a job ad. Search and
 * listing URLs on the same hosts must not match (fixture negatives in the tests).
 */
export const JOB_AD_URL_PATTERNS: Record<PresetId, RegExp> = {
  linkedin: /^https:\/\/(?:[a-z0-9-]+\.)*linkedin\.com\/jobs\/view\/[^/?#]+/i,
  indeed: /^https:\/\/(?:[a-z0-9-]+\.)*indeed\.com\/(?:(?:m\/)?viewjob\b|[^#]*[?&]jk=[a-z0-9]+)/i,
  pracuj: /^https:\/\/(?:[a-z0-9-]+\.)*pracuj\.pl\/praca\/[^?#]*,oferta,\d+/i,
  justjoin: /^https:\/\/justjoin\.it\/job-offer\/[^/?#]+/i,
  nofluffjobs: /^https:\/\/nofluffjobs\.com\/(?:[a-z]{2}\/)?job\/[^/?#]+/i,
  bulldogjob: /^https:\/\/bulldogjob\.pl\/companies\/jobs\/\d+/i,
  stepstone: /^https:\/\/(?:[a-z0-9-]+\.)*stepstone\.de\/stellenangebote--[^?#]+/i,
  theprotocol: /^https:\/\/theprotocol\.it\/szczegoly\/praca\/[^/?#]+/i,
};

/** The preset whose job-ad URL pattern matches, if any. */
export function matchJobAdUrl(url: string): PresetId | null {
  for (const [presetId, pattern] of Object.entries(JOB_AD_URL_PATTERNS)) {
    if (pattern.test(url)) return presetId as PresetId;
  }
  return null;
}
