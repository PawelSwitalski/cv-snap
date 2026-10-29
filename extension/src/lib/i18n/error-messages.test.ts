import { CvSnapError, ERROR_CODES } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { errorMessageKey, messageKeyFor } from "./error-messages";
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

  it("never shows internal details of unknown errors", () => {
    expect(messageKeyFor(new Error("stack with CV text"))).toBe("error_UNEXPECTED");
    expect(messageKeyFor(new CvSnapError("CLAUDE_NOT_FOUND", "x"))).toBe("error_CLAUDE_NOT_FOUND");
  });
});
