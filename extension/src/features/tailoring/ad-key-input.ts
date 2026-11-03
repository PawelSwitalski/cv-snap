import { adKeyFor, type AdKey } from "@cv-snap/shared";
import type { AdInput } from "./requirements-resolution";

/**
 * The `AdKey` of a captured ad: the requirements cache (story 004) and the history (intent 004)
 * use the same identity, so "the same ad" means the same thing in both. A manual selection is
 * keyed by its text; a page by its JSON-LD description, else its extracted text.
 */
export function adKeyForInput(ad: AdInput): Promise<AdKey> {
  return adKeyFor(
    ad.url,
    ad.isManualSelection
      ? { kind: "selection", text: ad.text }
      : { kind: "page", text: ad.structuredFields?.description ?? ad.text },
  );
}
