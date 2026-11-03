import { MAX_AD_CHARS, StructuredAdFieldsSchema, TRUNCATION_MARKER } from "@cv-snap/shared";
import { z } from "zod";
import { MAX_SNAPSHOT_BYTES } from "./snapshot";

/**
 * Messages between the job-ad content script and the background worker. Both directions are
 * validated on receipt: content scripts run in untrusted pages.
 */

/** Content → background whenever the detection result or the URL changes (story 003). */
export const JobAdStatusMessageSchema = z.object({
  type: z.literal("job-ad-status"),
  isJobAd: z.boolean(),
  url: z.string().max(4096),
});

export type JobAdStatusMessage = z.infer<typeof JobAdStatusMessageSchema>;

/** Background → content: capture the ad (or the user's selection) now (stories 004 and 005). */
export const CaptureJobAdRequestSchema = z.object({
  type: z.literal("capture-job-ad"),
  /**
   * False for the already-in-history hint (bolt 024), which needs only the ad's identity: the page
   * snapshot is skipped. Missing means true (generation).
   */
  withSnapshot: z.boolean().optional(),
});

export type CaptureJobAdRequest = z.infer<typeof CaptureJobAdRequestSchema>;

/** Minimum length of a manual selection (FR-8). */
export const MIN_SELECTION_CHARS = 200;

const AdInputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(MAX_AD_CHARS + TRUNCATION_MARKER.length + 1),
  url: z.string().max(4096).nullable(),
  structuredFields: StructuredAdFieldsSchema.nullable(),
  isManualSelection: z.boolean(),
});

/**
 * Why nothing could be captured. `JOB_AD_NOT_DETECTED` maps to the shared error code in the UI;
 * the others are UI-only reasons (no new `ErrorCode`, decision 5).
 */
export const CAPTURE_FAILURES = [
  "JOB_AD_NOT_DETECTED",
  "SELECTION_TOO_SHORT",
  "SITE_NOT_ALLOWED",
] as const;

/** The cleaned page for the history (story 003-page-snapshot); a UTF-16 length bounds the bytes. */
export const PageSnapshotSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("saved"), html: z.string().min(1).max(MAX_SNAPSHOT_BYTES) }),
  z.object({ status: z.literal("too-large") }),
  z.object({ status: z.literal("none") }),
]);

export const CaptureResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    ad: AdInputSchema,
    /** Optional: a content script of an older build (still open in a tab) doesn't send it. */
    snapshot: PageSnapshotSchema.optional(),
  }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(CAPTURE_FAILURES),
    /** "Select the ad text and try again" (FR-8). */
    hint: z.literal("SELECT_AD_TEXT").optional(),
  }),
]);

export type CaptureResult = z.infer<typeof CaptureResultSchema>;
export type CaptureFailure = (typeof CAPTURE_FAILURES)[number];
