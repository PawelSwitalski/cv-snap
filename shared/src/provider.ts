import type { CvProfile, CvProfileContent } from "./cv-profile.js";
import type { JobRequirements, StructuredAdFields } from "./job-requirements.js";
import type { LanguageCode } from "./language.js";
import type { ModelId } from "./models.js";
import type { HealthReport, ProgressStep } from "./protocol.js";
import type { TailoringPlan } from "./tailoring-plan.js";

/**
 * Port for every AI step (system architecture → ports and adapters). The extension depends only on
 * this interface; `ClaudeCodeProvider` in the native host is the v1 adapter.
 *
 * Implementations throw `CvSnapError` (e.g. `MODEL_UNAVAILABLE`, `GENERATION_TIMEOUT`, `CANCELLED`
 * when `signal` aborts) and never return unvalidated data.
 */
export interface ProviderCallOptions {
  model: ModelId;
  signal: AbortSignal;
  onProgress?: (step: ProgressStep) => void;
}

export interface CreateProfileInput {
  cvText: string;
}

export interface ParseRequirementsInput {
  adText: string;
  url: string | null;
  /** schema.org JobPosting fields from the page (FR-7), when the page has them. */
  structuredFields?: StructuredAdFields | null;
}

export interface TailorInput {
  profile: CvProfile;
  requirements: JobRequirements;
  outputLanguage: LanguageCode;
  /** Validator errors from the previous attempt; only set on the single retry (FR-11). */
  validatorFeedback: string[] | null;
}

export interface CvGenerationProvider {
  checkHealth(options: { signal: AbortSignal }): Promise<HealthReport>;
  createProfile(input: CreateProfileInput, options: ProviderCallOptions): Promise<CvProfileContent>;
  parseRequirements(
    input: ParseRequirementsInput,
    options: ProviderCallOptions,
  ): Promise<JobRequirements>;
  tailor(input: TailorInput, options: ProviderCallOptions): Promise<TailoringPlan>;
}
