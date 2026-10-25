import { describe, expect, it } from "vitest";
import { getHealthIssues, isVersionAtLeast, MIN_CLAUDE_CODE_VERSION } from "./health.js";
import type { HealthReport } from "./protocol.js";

const healthy: HealthReport = {
  hostVersion: "0.1.0",
  claudeFound: true,
  claudeVersion: "2.1.302",
  isAuthenticated: true,
  isVersionSupported: true,
};

describe("getHealthIssues", () => {
  it("returns no issues for a healthy setup", () => {
    expect(getHealthIssues(healthy)).toEqual([]);
  });

  it("reports only CLAUDE_NOT_FOUND when the CLI is missing", () => {
    const report = {
      ...healthy,
      claudeFound: false,
      isAuthenticated: false,
      isVersionSupported: false,
    };

    expect(getHealthIssues(report)).toEqual([{ code: "CLAUDE_NOT_FOUND", severity: "error" }]);
  });

  it("reports a logged-out CLI as an error and an old version as a warning", () => {
    const report = { ...healthy, isAuthenticated: false, isVersionSupported: false };

    expect(getHealthIssues(report)).toEqual([
      { code: "CLAUDE_NOT_AUTHENTICATED", severity: "error" },
      { code: "CLAUDE_VERSION_UNSUPPORTED", severity: "warning" },
    ]);
  });
});

describe("isVersionAtLeast", () => {
  it.each([
    ["2.1.302", "2.1.302", true],
    ["2.1.303", "2.1.302", true],
    ["2.2.0", "2.1.302", true],
    ["3.0", "2.1.302", true],
    ["2.1.301", "2.1.302", false],
    ["2.0.999", "2.1.302", false],
    ["1.9.0", "2.1.302", false],
    ["2.1.302 (Claude Code)", "2.1.302", true],
    ["2.1", "2.1.0", true],
  ])("%s >= %s is %s", (version, minimum, expected) => {
    expect(isVersionAtLeast(version, minimum)).toBe(expected);
  });

  it("returns null when the version can't be read", () => {
    expect(isVersionAtLeast("unknown", MIN_CLAUDE_CODE_VERSION)).toBeNull();
  });

  it("records the version tested in spike 001 as the minimum", () => {
    expect(MIN_CLAUDE_CODE_VERSION).toBe("2.1.302");
  });
});
