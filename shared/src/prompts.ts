import type { CreateProfileInput, ParseRequirementsInput, TailorInput } from "./provider.js";

/**
 * A prompt for one AI step. `system` holds the fixed instructions; `user` holds the data, with
 * untrusted text (CV, job ad) delimited as data, never as instructions (FR-10).
 */
export interface Prompt {
  system: string;
  user: string;
}

/** Builds the prompt for each AI step. Implemented in story 003–005 (bolt 005-cv-tailoring-core). */
export interface PromptBuilders {
  profile(input: CreateProfileInput): Prompt;
  requirements(input: ParseRequirementsInput): Prompt;
  tailor(input: TailorInput): Prompt;
}
