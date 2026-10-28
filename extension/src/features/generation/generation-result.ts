import type {
  Gap,
  JobRequirements,
  LanguageCode,
  ModelId,
  OutputLanguage,
  ProgressStep,
  TailoringPlan,
  ValidationRun,
} from "@cv-snap/shared";
import type { AdInput } from "@/features/tailoring/requirements-resolution";

/** One click on Generate (story 007). */
export interface GenerationRequest {
  ad: AdInput;
  /** The user's language override for this generation only (FR-12), or null. */
  override: LanguageCode | null;
  model: ModelId;
  signal: AbortSignal;
  onProgress?: (step: ProgressStep) => void;
}

/**
 * Outcome of a generation: the chosen plan with its verdicts (unverified lines stay in, marked,
 * FR-11), the gaps (never in the CV) and timings. Lives in the extension only; never crosses
 * native messaging.
 */
export interface GenerationResult {
  plan: TailoringPlan;
  validation: ValidationRun;
  gaps: Gap[];
  requirements: JobRequirements;
  outputLanguage: OutputLanguage;
  fromCache: boolean;
  /** Tailoring calls made: 1, or 2 after the single retry. */
  attempts: 1 | 2;
  chosenAttempt: 1 | 2;
  durationsMs: { requirements: number; tailoring: number; validation: number; total: number };
}
