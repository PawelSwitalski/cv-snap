import { describe, expect, it } from "vitest";
import { deriveView, type ViewInputs } from "./view";

const base: ViewInputs = {
  isLoaded: true,
  isNoticeAcknowledged: true,
  isPrivacyOpen: false,
  isSettingsOpen: false,
  isHistoryOpen: false,
  hasDraft: false,
  hasActive: false,
  isSetupPassed: false,
  isUploadRequested: false,
  isHistoryOnly: false,
  historyOnlyStep: null,
};

describe("deriveView", () => {
  it.each<[string, Partial<ViewInputs>, ReturnType<typeof deriveView>]>([
    ["shows loading until storage is read", { isLoaded: false }, "loading"],
    ["shows the privacy notice first", { isNoticeAcknowledged: false }, "privacy"],
    [
      "keeps upload blocked until the notice is acknowledged",
      { isNoticeAcknowledged: false, isSetupPassed: true, isUploadRequested: true },
      "privacy",
    ],
    ["reopens the notice from settings", { isPrivacyOpen: true, hasActive: true }, "privacy"],
    [
      "shows the notice over settings when reopened there",
      { isPrivacyOpen: true, isSettingsOpen: true, hasActive: true },
      "privacy",
    ],
    ["opens settings over home", { isSettingsOpen: true, hasActive: true }, "settings"],
    ["opens settings over the editor", { isSettingsOpen: true, hasDraft: true }, "settings"],
    ["opens history over home", { isHistoryOpen: true, hasActive: true }, "history"],
    ["opens history over the editor", { isHistoryOpen: true, hasDraft: true }, "history"],
    ["lets settings win over history", { isSettingsOpen: true, isHistoryOpen: true }, "settings"],
    [
      "never opens history before the notice is acknowledged",
      { isNoticeAcknowledged: false, isHistoryOpen: true },
      "privacy",
    ],
    [
      "never opens settings before the notice is acknowledged",
      { isNoticeAcknowledged: false, isSettingsOpen: true },
      "privacy",
    ],
    ["runs the setup check after the notice on first run", {}, "setup"],
    ["offers the upload once the setup check passed", { isSetupPassed: true }, "upload"],
    ["opens the editor while a draft exists", { hasDraft: true, hasActive: true }, "editor"],
    ["shows home once a profile is confirmed", { hasActive: true }, "home"],
    [
      "uploads a new CV on request from home",
      { hasActive: true, isUploadRequested: true },
      "upload",
    ],
    // History-only mode (intent 005).
    [
      "uploads the CV only after Use without the helper",
      { historyOnlyStep: "upload" },
      "history-upload",
    ],
    ["shows history-only home when the mode is on", { isHistoryOnly: true }, "history-home"],
    [
      "goes to history-only home even after a passed setup check this session",
      { isHistoryOnly: true, isSetupPassed: true },
      "history-home",
    ],
    [
      "runs the setup check when setting up the helper later",
      { isHistoryOnly: true, historyOnlyStep: "helper-setup" },
      "helper-setup",
    ],
    [
      "offers the profile upload once that check passed",
      { isHistoryOnly: true, historyOnlyStep: "helper-upload" },
      "helper-upload",
    ],
    [
      "never shows history-only home next to a profile",
      { isHistoryOnly: true, hasActive: true },
      "home",
    ],
    ["opens the editor over history-only mode", { isHistoryOnly: true, hasDraft: true }, "editor"],
    [
      "opens history over history-only home",
      { isHistoryOnly: true, isHistoryOpen: true },
      "history",
    ],
    [
      "opens settings over history-only home",
      { isHistoryOnly: true, isSettingsOpen: true },
      "settings",
    ],
    [
      "ignores a helper step without the mode",
      { historyOnlyStep: "helper-setup", isSetupPassed: true },
      "upload",
    ],
  ])("%s", (_label, inputs, expected) => {
    expect(deriveView({ ...base, ...inputs })).toBe(expected);
  });
});
