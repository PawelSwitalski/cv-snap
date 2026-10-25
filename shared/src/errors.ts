import { z } from "zod";

/**
 * Every failure that can cross the native-messaging connection or reach the UI.
 * Each code needs a PL and EN user message with a fix hint (FR-17, story 007-error-messages).
 */
export const ERROR_CODES = [
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
] as const;

export const ErrorCodeSchema = z.enum(ERROR_CODES);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/** Error as carried inside `NativeResponse`. `reason` holds a sub-cause, e.g. `NO_TEXT`. */
export const ErrorPayloadSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  reason: z.string().optional(),
});

export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

/** Typed error thrown within a process; converted to `ErrorPayload` at the process boundary. */
export class CvSnapError extends Error {
  override readonly name = "CvSnapError";
  readonly code: ErrorCode;
  readonly reason: string | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    options: { reason?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.code = code;
    this.reason = options.reason;
  }

  toPayload(): ErrorPayload {
    return this.reason === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, reason: this.reason };
  }
}

/**
 * Converts anything thrown into an `ErrorPayload`. Unknown errors become `fallbackCode` with a
 * generic message, so internal details (which might include personal data) never leak.
 */
export function toErrorPayload(
  error: unknown,
  fallbackCode: ErrorCode = "GENERATION_FAILED",
): ErrorPayload {
  if (error instanceof CvSnapError) return error.toPayload();
  return { code: fallbackCode, message: "Unexpected error" };
}
