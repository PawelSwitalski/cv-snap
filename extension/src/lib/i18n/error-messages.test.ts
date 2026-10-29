import { CvSnapError, ERROR_CODES } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { errorFixKey, errorMessageKey, messageKeyFor } from "./error-messages";
import { formatMessage } from "./messages";

describe("error messages", () => {
  it.each([
    ["NO_TEXT", "error_PDF_NO_TEXT"],
    ["PASSWORD_PROTECTED", "error_PDF_PASSWORD_PROTECTED"],
    ["CORRUPTED", "error_PDF_CORRUPTED"],
    ["TOO_LARGE", "error_PDF_TOO_LARGE"],
    ["UNREADABLE", "error_PDF_UNREADABLE"],
    [undefined, "error_PDF_UNREADABLE"],
    ["SOMETHING_NEW", "error_PDF_UNREADABLE"],
  ])("maps PDF_PARSE_FAILED reason %s to %s", (reason, key) => {
    expect(errorMessageKey("PDF_PARSE_FAILED", reason)).toBe(key);
  });

  it("tells the user that scanned PDFs aren't supported, in both languages", () => {
    for (const language of ["en", "pl"] as const) {
      expect(formatMessage(language, "error_PDF_NO_TEXT")).not.toBe("error_PDF_NO_TEXT");
    }
  });

  it("has a non-empty message in both languages for every error code", () => {
    for (const code of ERROR_CODES) {
      const key = errorMessageKey(code);
      for (const language of ["en", "pl"] as const) {
        expect(formatMessage(language, key).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("has a real message and fix hint in both languages for every error code (story 007)", () => {
    for (const code of ERROR_CODES) {
      for (const key of [errorMessageKey(code), errorFixKey(code)]) {
        for (const language of ["en", "pl"] as const) {
          const text = formatMessage(language, key);
          expect(text, `${language} ${code} → ${key}`).not.toBe(key);
          expect(text.trim().length).toBeGreaterThan(0);
        }
      }
      // The fix says what to do, not the problem again.
      expect(errorFixKey(code)).not.toBe(errorMessageKey(code));
    }
  });

  it("names the install command for a missing or lost host", () => {
    for (const code of ["HOST_NOT_INSTALLED", "HOST_DISCONNECTED"] as const) {
      for (const language of ["en", "pl"] as const) {
        expect(formatMessage(language, errorFixKey(code))).toContain("pnpm run install-host");
      }
    }
  });

  it.each([
    [
      "JOB_AD_NOT_DETECTED",
      "SELECTION_TOO_SHORT",
      "error_SELECTION_TOO_SHORT",
      "fix_SELECTION_TOO_SHORT",
    ],
    ["JOB_AD_NOT_DETECTED", "SITE_NOT_ALLOWED", "error_SITE_NOT_ALLOWED", "fix_SITE_NOT_ALLOWED"],
    [
      "GENERATION_FAILED",
      "PROFILE_NOT_CONFIRMED",
      "generate_confirm_first",
      "fix_PROFILE_NOT_CONFIRMED",
    ],
    ["GENERATION_FAILED", "INVALID_OUTPUT", "error_GENERATION_FAILED", "fix_GENERATION_FAILED"],
  ] as const)("maps %s/%s to its own message and fix", (code, reason, message, fix) => {
    expect(errorMessageKey(code, reason)).toBe(message);
    expect(errorFixKey(code, reason)).toBe(fix);
  });

  it("never shows internal details of unknown errors", () => {
    expect(messageKeyFor(new Error("stack with CV text"))).toBe("error_UNEXPECTED");
    expect(messageKeyFor(new CvSnapError("CLAUDE_NOT_FOUND", "x"))).toBe("error_CLAUDE_NOT_FOUND");
  });
});
