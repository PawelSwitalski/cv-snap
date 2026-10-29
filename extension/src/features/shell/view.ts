/** Which screen the side panel shows. Derived from stored state, never kept in the URL. */
export type PanelView = "loading" | "privacy" | "setup" | "upload" | "editor" | "home";

export interface ViewInputs {
  isLoaded: boolean;
  isNoticeAcknowledged: boolean;
  /** The user reopened the notice from the header. */
  isPrivacyOpen: boolean;
  hasDraft: boolean;
  hasActive: boolean;
  /** The setup check passed during this session (first run only). */
  isSetupPassed: boolean;
  /** The user chose "Upload a new CV" from home. */
  isUploadRequested: boolean;
}

/**
 * Onboarding order (story 002): notice → setup check → upload; then the editor while a draft
 * exists, and home once a profile is confirmed.
 */
export function deriveView(inputs: ViewInputs): PanelView {
  if (!inputs.isLoaded) return "loading";
  if (!inputs.isNoticeAcknowledged || inputs.isPrivacyOpen) return "privacy";
  if (inputs.hasDraft) return "editor";
  if (inputs.isUploadRequested) return "upload";
  if (inputs.hasActive) return "home";
  return inputs.isSetupPassed ? "upload" : "setup";
}
