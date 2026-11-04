/** Which screen the side panel shows. Derived from stored state, never kept in the URL. */
export type PanelView =
  | "loading"
  | "privacy"
  | "settings"
  | "history"
  | "setup"
  | "upload"
  | "editor"
  | "home"
  | "history-upload"
  | "history-home"
  | "helper-setup"
  | "helper-upload";

/**
 * A step of history-only mode (intent 005) the user is in: uploading the CV after "Use without the
 * helper", or setting up the helper later (the check, then the profile upload).
 */
export type HistoryOnlyStep = "upload" | "helper-setup" | "helper-upload";

export interface ViewInputs {
  isLoaded: boolean;
  isNoticeAcknowledged: boolean;
  /** The user reopened the notice from the header. */
  isPrivacyOpen: boolean;
  /** The user opened Settings from the header (story 008). */
  isSettingsOpen: boolean;
  /** The user opened History from the header (intent 004). */
  isHistoryOpen: boolean;
  hasDraft: boolean;
  hasActive: boolean;
  /** The setup check passed during this session (first run only). */
  isSetupPassed: boolean;
  /** The user chose "Upload a new CV" from home. */
  isUploadRequested: boolean;
  /** History-only mode is on (stored); ignored once a draft or profile exists. */
  isHistoryOnly: boolean;
  historyOnlyStep: HistoryOnlyStep | null;
}

/**
 * Onboarding order (story 002): notice → setup check → upload; then the editor while a draft
 * exists, and home once a profile is confirmed. Settings open over any view once the notice was
 * acknowledged; the notice can be reopened from settings. History-only mode (intent 005) comes
 * after a draft or a profile, so a user with a profile is never in it.
 */
export function deriveView(inputs: ViewInputs): PanelView {
  if (!inputs.isLoaded) return "loading";
  if (!inputs.isNoticeAcknowledged || inputs.isPrivacyOpen) return "privacy";
  if (inputs.isSettingsOpen) return "settings";
  if (inputs.isHistoryOpen) return "history";
  if (inputs.hasDraft) return "editor";
  if (inputs.isUploadRequested) return "upload";
  if (inputs.hasActive) return "home";
  if (inputs.historyOnlyStep === "upload") return "history-upload";
  if (inputs.isHistoryOnly) {
    if (inputs.historyOnlyStep === "helper-setup") return "helper-setup";
    if (inputs.historyOnlyStep === "helper-upload") return "helper-upload";
    return "history-home";
  }
  return inputs.isSetupPassed ? "upload" : "setup";
}
