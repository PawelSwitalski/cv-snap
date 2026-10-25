import { z } from "zod";
import { CvProfileContentSchema, CvProfileSchema } from "./cv-profile.js";
import { ErrorPayloadSchema, type ErrorPayload } from "./errors.js";
import { JobRequirementsSchema } from "./job-requirements.js";
import { LanguageCodeSchema } from "./language.js";
import { ModelIdSchema } from "./models.js";
import { TailoringPlanSchema } from "./tailoring-plan.js";

/**
 * Native-messaging protocol between the extension and the host (length-prefixed JSON over stdio).
 * Every frame is validated with these schemas before use; anything else is `INVALID_MESSAGE`.
 */

/** Name under which the host is registered with Chrome. */
export const NATIVE_HOST_NAME = "com.cvsnap.host";

/** Chrome accepts up to 64 MB extension → host. */
export const MAX_INBOUND_MESSAGE_BYTES = 64 * 1024 * 1024;
/** Chrome rejects host → extension messages of 1 MB or more. */
export const MAX_OUTBOUND_MESSAGE_BYTES = 1024 * 1024;

export const RequestIdSchema = z.string().min(1).max(64);

export type RequestId = z.infer<typeof RequestIdSchema>;

export const PROGRESS_STEPS = [
  "extracting-pdf-text",
  "creating-profile",
  "reading-job-ad",
  "parsing-requirements",
  "tailoring",
  "validating",
  "retrying",
  "rendering",
] as const;

export const ProgressStepSchema = z.enum(PROGRESS_STEPS);

export type ProgressStep = z.infer<typeof ProgressStepSchema>;

const base = { requestId: RequestIdSchema };

export const HealthRequestSchema = z.object({ type: z.literal("health"), ...base });

export const ExtractPdfTextRequestSchema = z.object({
  type: z.literal("extractPdfText"),
  ...base,
  pdfBase64: z.string().min(1),
});

export const CreateProfileRequestSchema = z.object({
  type: z.literal("createProfile"),
  ...base,
  model: ModelIdSchema,
  cvText: z.string().min(1),
});

export const ParseRequirementsRequestSchema = z.object({
  type: z.literal("parseRequirements"),
  ...base,
  model: ModelIdSchema,
  adText: z.string().min(1),
  url: z.string().nullable(),
});

export const TailorRequestSchema = z.object({
  type: z.literal("tailor"),
  ...base,
  model: ModelIdSchema,
  profile: CvProfileSchema,
  requirements: JobRequirementsSchema,
  outputLanguage: LanguageCodeSchema,
  /** Validator errors from the previous attempt; present only on the single retry (FR-11). */
  validatorFeedback: z.array(z.string()).nullable(),
});

/** Aborts the running request with the same `requestId`; that request then replies `CANCELLED`. */
export const CancelRequestSchema = z.object({ type: z.literal("cancel"), ...base });

export const NativeRequestSchema = z.discriminatedUnion("type", [
  HealthRequestSchema,
  ExtractPdfTextRequestSchema,
  CreateProfileRequestSchema,
  ParseRequirementsRequestSchema,
  TailorRequestSchema,
  CancelRequestSchema,
]);

export type NativeRequest = z.infer<typeof NativeRequestSchema>;
export type NativeRequestType = NativeRequest["type"];

export const HealthReportSchema = z.object({
  hostVersion: z.string(),
  claudeFound: z.boolean(),
  claudeVersion: z.string().nullable(),
  isAuthenticated: z.boolean(),
  /** False → warning with an update hint, not a hard failure (story 004-health-check). */
  isVersionSupported: z.boolean(),
});

export type HealthReport = z.infer<typeof HealthReportSchema>;

export const PdfTextSchema = z.object({
  text: z.string(),
  pageCount: z.number().int().min(0),
});

export type PdfText = z.infer<typeof PdfTextSchema>;

/** Schema of the `data` each request type replies with (`cancel` gets no reply of its own). */
export const RESPONSE_DATA_SCHEMAS = {
  health: HealthReportSchema,
  extractPdfText: PdfTextSchema,
  createProfile: CvProfileContentSchema,
  parseRequirements: JobRequirementsSchema,
  tailor: TailoringPlanSchema,
} as const;

export type ResponseData = {
  [K in keyof typeof RESPONSE_DATA_SCHEMAS]: z.infer<(typeof RESPONSE_DATA_SCHEMAS)[K]>;
};

/** Reply shape across the native-messaging connection (coding standards → Error Handling). */
export type NativeResponse<T> = { ok: true; data: T } | { ok: false; error: ErrorPayload };

export function nativeResponseSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data }),
    z.object({ ok: z.literal(false), error: ErrorPayloadSchema }),
  ]);
}

export const ProgressFrameSchema = z.object({
  type: z.literal("progress"),
  ...base,
  step: ProgressStepSchema,
});

/** Final reply; `response.data` is checked against `RESPONSE_DATA_SCHEMAS` by the caller. */
export const ResponseFrameSchema = z.object({
  type: z.literal("response"),
  ...base,
  response: nativeResponseSchema(z.unknown()),
});

export const HostFrameSchema = z.discriminatedUnion("type", [
  ProgressFrameSchema,
  ResponseFrameSchema,
]);

export type ProgressFrame = z.infer<typeof ProgressFrameSchema>;
export type ResponseFrame = z.infer<typeof ResponseFrameSchema>;
export type HostFrame = z.infer<typeof HostFrameSchema>;

/** Validates an untrusted inbound frame. Never throws. */
export function parseNativeRequest(input: unknown): NativeResponse<NativeRequest> {
  const result = NativeRequestSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    error: { code: "INVALID_MESSAGE", message: z.prettifyError(result.error) },
  };
}
