import type { CvGenerationProvider, CvProfileContent, ProviderCallOptions } from "@cv-snap/shared";
import { logger } from "@/lib/logger";
import { retryOnceOnInvalidOutput } from "./retry";

/**
 * Profile extraction use case (story 003): CV text → draft profile with code-assigned IDs (the
 * host assigns them before replying). One retry on invalid output, then `GENERATION_FAILED`.
 */
export class ProfileExtraction {
  constructor(private readonly provider: CvGenerationProvider) {}

  async createDraft(cvText: string, options: ProviderCallOptions): Promise<CvProfileContent> {
    const startedAt = Date.now();
    const draft = await retryOnceOnInvalidOutput(
      () => this.provider.createProfile({ cvText }, options),
      options.signal,
    );
    logger.info("profile draft created", {
      sourceLanguage: draft.sourceLanguage,
      experienceItems: draft.experience.length,
      durationMs: Date.now() - startedAt,
    });
    return draft;
  }
}
