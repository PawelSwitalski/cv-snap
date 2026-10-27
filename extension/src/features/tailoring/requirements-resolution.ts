import {
  adKeyFor,
  type AdKey,
  type CvGenerationProvider,
  type JobRequirements,
  type ProviderCallOptions,
  type StructuredAdFields,
} from "@cv-snap/shared";
import { logger } from "@/lib/logger";
import type { Clock, RequirementsCacheRepository } from "./ports";
import { retryOnceOnInvalidOutput } from "./retry";

/** One ad as captured from the page (ddd-01 "AdInput"); its text is untrusted. */
export interface AdInput {
  text: string;
  url: string | null;
  structuredFields: StructuredAdFields | null;
  /** True when the user selected the text by hand (FR-8): the selection becomes part of the key. */
  isManualSelection: boolean;
}

export interface ResolvedRequirements {
  requirements: JobRequirements;
  adKey: AdKey;
  fromCache: boolean;
}

/**
 * Requirements use case (story 004): a fresh cached parse for the same ad is reused for 7 days
 * without calling the host; otherwise Claude parses the ad (one retry on invalid output) and the
 * result is cached. Only parsed requirements are cached, never the ad text.
 */
export class RequirementsResolution {
  constructor(
    private readonly provider: CvGenerationProvider,
    private readonly cache: RequirementsCacheRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async resolve(ad: AdInput, options: ProviderCallOptions): Promise<ResolvedRequirements> {
    const adKey = await adKeyFor(ad.url, ad.isManualSelection ? ad.text : undefined);
    const cached = await this.cache.get(adKey, this.now()).catch((error: unknown) => {
      logger.warn("requirements cache read failed; treated as a miss", error);
      return null;
    });
    if (cached) {
      options.onProgress?.("parsing-requirements");
      return { requirements: cached.requirements, adKey, fromCache: true };
    }

    const requirements = await retryOnceOnInvalidOutput(
      () =>
        this.provider.parseRequirements(
          { adText: ad.text, url: ad.url, structuredFields: ad.structuredFields },
          options,
        ),
      options.signal,
    );
    const now = this.now();
    await this.cache
      .put(adKey, { requirements, parsedAt: now.toISOString() }, now)
      .catch((error: unknown) => {
        logger.warn("requirements cache write failed; continuing without caching", error);
      });
    return { requirements, adKey, fromCache: false };
  }
}
