import { CvSnapError, type ErrorCode } from "@cv-snap/shared";
import type { MessageKey } from "./messages";

/**
 * User-facing message for an error (FR-17). This bolt covers the codes the setup check and the CV
 * upload can produce; bolt 011 completes the list for generation.
 */
const ERROR_MESSAGES: Partial<Record<ErrorCode, MessageKey>> = {
  HOST_NOT_INSTALLED: "error_HOST_NOT_INSTALLED",
  HOST_DISCONNECTED: "error_HOST_DISCONNECTED",
  CLAUDE_NOT_FOUND: "error_CLAUDE_NOT_FOUND",
  CLAUDE_NOT_AUTHENTICATED: "error_CLAUDE_NOT_AUTHENTICATED",
  CLAUDE_VERSION_UNSUPPORTED: "error_CLAUDE_VERSION_UNSUPPORTED",
  MODEL_UNAVAILABLE: "error_MODEL_UNAVAILABLE",
  GENERATION_TIMEOUT: "error_GENERATION_TIMEOUT",
  GENERATION_FAILED: "error_GENERATION_FAILED",
  CANCELLED: "error_CANCELLED",
  MESSAGE_TOO_LARGE: "error_MESSAGE_TOO_LARGE",
};

/** PDF_PARSE_FAILED sub-causes from the host's PDF extraction (bolt 004). */
const PDF_REASON_MESSAGES: Record<string, MessageKey> = {
  NO_TEXT: "error_PDF_NO_TEXT",
  PASSWORD_PROTECTED: "error_PDF_PASSWORD_PROTECTED",
  CORRUPTED: "error_PDF_CORRUPTED",
  TOO_LARGE: "error_PDF_TOO_LARGE",
  UNREADABLE: "error_PDF_UNREADABLE",
};

export function errorMessageKey(code: ErrorCode, reason?: string): MessageKey {
  if (code === "PDF_PARSE_FAILED") {
    return (
      (reason !== undefined ? PDF_REASON_MESSAGES[reason] : undefined) ?? "error_PDF_UNREADABLE"
    );
  }
  return ERROR_MESSAGES[code] ?? "error_UNEXPECTED";
}

/** Message key for anything thrown; unknown errors get a generic message (no internals shown). */
export function messageKeyFor(error: unknown): MessageKey {
  return error instanceof CvSnapError
    ? errorMessageKey(error.code, error.reason)
    : "error_UNEXPECTED";
}
