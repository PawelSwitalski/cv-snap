import { CvSnapError, type ErrorCode } from "@cv-snap/shared";
import type { MessageKey } from "./messages";

/** User-facing message for every error code (FR-17); a new code fails typecheck until added. */
const ERROR_MESSAGES: Record<ErrorCode, MessageKey> = {
  HOST_NOT_INSTALLED: "error_HOST_NOT_INSTALLED",
  HOST_DISCONNECTED: "error_HOST_DISCONNECTED",
  CLAUDE_NOT_FOUND: "error_CLAUDE_NOT_FOUND",
  CLAUDE_NOT_AUTHENTICATED: "error_CLAUDE_NOT_AUTHENTICATED",
  CLAUDE_VERSION_UNSUPPORTED: "error_CLAUDE_VERSION_UNSUPPORTED",
  HOST_VERSION_MISMATCH: "error_HOST_VERSION_MISMATCH",
  MODEL_UNAVAILABLE: "error_MODEL_UNAVAILABLE",
  PDF_PARSE_FAILED: "error_PDF_UNREADABLE",
  JOB_AD_NOT_DETECTED: "error_JOB_AD_NOT_DETECTED",
  INVALID_MESSAGE: "error_INVALID_MESSAGE",
  MESSAGE_TOO_LARGE: "error_MESSAGE_TOO_LARGE",
  GENERATION_TIMEOUT: "error_GENERATION_TIMEOUT",
  GENERATION_FAILED: "error_GENERATION_FAILED",
  CANCELLED: "error_CANCELLED",
};

/**
 * How to fix it, for every error code (story 007), worded for the generate flow. The setup check
 * keeps its own `hint_*` texts ("…then click Check again").
 */
const ERROR_FIXES: Record<ErrorCode, MessageKey> = {
  HOST_NOT_INSTALLED: "fix_HOST_NOT_INSTALLED",
  HOST_DISCONNECTED: "fix_HOST_DISCONNECTED",
  CLAUDE_NOT_FOUND: "fix_CLAUDE_NOT_FOUND",
  CLAUDE_NOT_AUTHENTICATED: "fix_CLAUDE_NOT_AUTHENTICATED",
  CLAUDE_VERSION_UNSUPPORTED: "fix_CLAUDE_VERSION_UNSUPPORTED",
  HOST_VERSION_MISMATCH: "fix_HOST_VERSION_MISMATCH",
  MODEL_UNAVAILABLE: "fix_MODEL_UNAVAILABLE",
  PDF_PARSE_FAILED: "fix_PDF_PARSE_FAILED",
  JOB_AD_NOT_DETECTED: "fix_JOB_AD_NOT_DETECTED",
  INVALID_MESSAGE: "fix_INVALID_MESSAGE",
  MESSAGE_TOO_LARGE: "fix_MESSAGE_TOO_LARGE",
  GENERATION_TIMEOUT: "fix_GENERATION_TIMEOUT",
  GENERATION_FAILED: "fix_GENERATION_FAILED",
  CANCELLED: "fix_CANCELLED",
};

/** PDF_PARSE_FAILED sub-causes from the host's PDF extraction (bolt 004). */
const PDF_REASON_MESSAGES: Record<string, MessageKey> = {
  NO_TEXT: "error_PDF_NO_TEXT",
  PASSWORD_PROTECTED: "error_PDF_PASSWORD_PROTECTED",
  CORRUPTED: "error_PDF_CORRUPTED",
  TOO_LARGE: "error_PDF_TOO_LARGE",
  UNREADABLE: "error_PDF_UNREADABLE",
};

/** Sub-causes with their own message and fix (capture reasons from bolt 008, pipeline reasons). */
const REASON_MESSAGES: Partial<Record<ErrorCode, Record<string, [MessageKey, MessageKey]>>> = {
  JOB_AD_NOT_DETECTED: {
    SELECTION_TOO_SHORT: ["error_SELECTION_TOO_SHORT", "fix_SELECTION_TOO_SHORT"],
    SITE_NOT_ALLOWED: ["error_SITE_NOT_ALLOWED", "fix_SITE_NOT_ALLOWED"],
  },
  GENERATION_FAILED: {
    PROFILE_NOT_CONFIRMED: ["generate_confirm_first", "fix_PROFILE_NOT_CONFIRMED"],
  },
};

export function errorMessageKey(code: ErrorCode, reason?: string): MessageKey {
  if (code === "PDF_PARSE_FAILED") {
    return (
      (reason !== undefined ? PDF_REASON_MESSAGES[reason] : undefined) ?? "error_PDF_UNREADABLE"
    );
  }
  const byReason = reason !== undefined ? REASON_MESSAGES[code]?.[reason] : undefined;
  return byReason?.[0] ?? ERROR_MESSAGES[code];
}

/** The fix hint shown under the message (e.g. "Run `pnpm run install-host`"). */
export function errorFixKey(code: ErrorCode, reason?: string): MessageKey {
  const byReason = reason !== undefined ? REASON_MESSAGES[code]?.[reason] : undefined;
  return byReason?.[1] ?? ERROR_FIXES[code];
}

/** Message key for anything thrown; unknown errors get a generic message (no internals shown). */
export function messageKeyFor(error: unknown): MessageKey {
  return error instanceof CvSnapError
    ? errorMessageKey(error.code, error.reason)
    : "error_UNEXPECTED";
}
