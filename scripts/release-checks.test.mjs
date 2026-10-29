import { describe, expect, it } from "vitest";
import { releaseProblems } from "./release-checks.mjs";

const READY = {
  extensionVersion: "0.1.0",
  hostVersion: "0.1.0",
  storeExtensionId: "abcdefghijklmnopabcdefghijklmnop",
  repositoryUrl: "git+https://github.com/someone/cv-snap.git",
};

describe("releaseProblems", () => {
  it("finds nothing when versions match, the store ID is set and the repository is real", () => {
    expect(releaseProblems(READY)).toEqual([]);
  });

  it("refuses different versions, even in the patch number", () => {
    expect(releaseProblems({ ...READY, hostVersion: "0.1.1" })).toEqual([
      expect.stringContaining("Versions differ: extension 0.1.0, host 0.1.1"),
    ]);
  });

  it("refuses a missing or malformed store ID", () => {
    expect(releaseProblems({ ...READY, storeExtensionId: "" })).toEqual([
      expect.stringContaining("Chrome Web Store ID isn't set"),
    ]);
    expect(releaseProblems({ ...READY, storeExtensionId: "not-an-id" })).toEqual([
      expect.stringContaining("isn't a valid extension ID"),
    ]);
  });

  it("refuses the OWNER placeholder or a missing repository URL", () => {
    for (const repositoryUrl of ["git+https://github.com/OWNER/cv-snap.git", undefined]) {
      expect(releaseProblems({ ...READY, repositoryUrl })).toEqual([
        expect.stringContaining("no real repository URL"),
      ]);
    }
  });

  it("lists every reason at once", () => {
    const problems = releaseProblems({
      extensionVersion: "0.2.0",
      hostVersion: "0.1.0",
      storeExtensionId: "",
      repositoryUrl: "git+https://github.com/OWNER/cv-snap.git",
    });

    expect(problems).toHaveLength(3);
  });
});
