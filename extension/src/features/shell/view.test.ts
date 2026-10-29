import { describe, expect, it } from "vitest";
import { deriveView, type ViewInputs } from "./view";

const base: ViewInputs = {
  isLoaded: true,
  isNoticeAcknowledged: true,
  isPrivacyOpen: false,
  isSettingsOpen: false,
  hasDraft: false,
  hasActive: false,
  isSetupPassed: false,
  isUploadRequested: false,
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
  ])("%s", (_label, inputs, expected) => {
    expect(deriveView({ ...base, ...inputs })).toBe(expected);
  });
});
