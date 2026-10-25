import { describe, expect, it } from "vitest";
import { CvSnapError, ERROR_CODES, ErrorPayloadSchema, toErrorPayload } from "./errors.js";

describe("ERROR_CODES", () => {
  it("contains every code named in the requirements and the spike additions", () => {
    const required = [
      "HOST_NOT_INSTALLED",
      "HOST_DISCONNECTED",
      "CLAUDE_NOT_FOUND",
      "CLAUDE_NOT_AUTHENTICATED",
      "CLAUDE_VERSION_UNSUPPORTED",
      "MODEL_UNAVAILABLE",
      "PDF_PARSE_FAILED",
      "JOB_AD_NOT_DETECTED",
      "INVALID_MESSAGE",
      "MESSAGE_TOO_LARGE",
      "GENERATION_TIMEOUT",
      "GENERATION_FAILED",
      "CANCELLED",
    ];

    expect([...ERROR_CODES].sort()).toEqual([...required].sort());
  });
});

describe("CvSnapError", () => {
  it("carries code, message and reason, and converts to a valid payload", () => {
    const error = new CvSnapError("PDF_PARSE_FAILED", "No text in PDF", { reason: "NO_TEXT" });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("CvSnapError");
    expect(error.toPayload()).toEqual({
      code: "PDF_PARSE_FAILED",
      message: "No text in PDF",
      reason: "NO_TEXT",
    });
    expect(ErrorPayloadSchema.safeParse(error.toPayload()).success).toBe(true);
  });

  it("omits reason from the payload when none was given", () => {
    const payload = new CvSnapError("CANCELLED", "Cancelled").toPayload();

    expect(payload).toEqual({ code: "CANCELLED", message: "Cancelled" });
  });

  it("keeps the original cause for in-process debugging", () => {
    const cause = new Error("spawn ENOENT");

    expect(new CvSnapError("CLAUDE_NOT_FOUND", "not found", { cause }).cause).toBe(cause);
  });
});

describe("toErrorPayload", () => {
  it("passes CvSnapError through unchanged", () => {
    const error = new CvSnapError("MODEL_UNAVAILABLE", "Model not available");

    expect(toErrorPayload(error)).toEqual({
      code: "MODEL_UNAVAILABLE",
      message: "Model not available",
    });
  });

  it("hides the details of unknown errors behind a generic message", () => {
    const leaky = new Error("failed while reading CV of Jan Testowy");

    const payload = toErrorPayload(leaky);

    expect(payload).toEqual({ code: "GENERATION_FAILED", message: "Unexpected error" });
  });

  it("uses the given fallback code for unknown errors", () => {
    expect(toErrorPayload("boom", "INVALID_MESSAGE").code).toBe("INVALID_MESSAGE");
  });
});
