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
import type { SnapshotStatus } from "@/features/history/history-entry";
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
  /**
   * The ad the CV is for, for the history (intent 004). Added by the generation port; missing in a
   * result restored from a 0.1.x session, which then isn't saved to history.
   */
  ad?: GeneratedAd;
}

/** The captured ad as the history needs it; the page snapshot stays in IndexedDB (pending). */
export interface GeneratedAd {
  adKey: string;
  url: string | null;
  text: string;
  isManualSelection: boolean;
  snapshot: SnapshotStatus;
}
