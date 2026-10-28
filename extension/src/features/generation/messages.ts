import {
  ErrorPayloadSchema,
  LanguageCodeSchema,
  ModelIdSchema,
  ProgressStepSchema,
} from "@cv-snap/shared";
import { z } from "zod";

/** Name of the long-lived side panel ↔ background port for generation (ddd-02 decision 8). */
export const GENERATION_PORT_NAME = "cv-snap-generation";

/** Side panel → background: start a generation for the ad in a tab. */
export const GenerateMessageSchema = z.object({
  type: z.literal("generate"),
  tabId: z.number().int().nonnegative(),
  override: LanguageCodeSchema.nullable(),
  model: ModelIdSchema,
});

export type GenerateMessage = z.infer<typeof GenerateMessageSchema>;

/**
 * Background → side panel: progress, then exactly one `result` or `error`. The result is the
 * pipeline's `GenerationResult` (plain JSON within the extension; never sent to the host).
 */
export const GenerationEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("progress"), step: ProgressStepSchema }),
  z.object({ type: z.literal("result"), result: z.unknown() }),
  z.object({ type: z.literal("error"), error: ErrorPayloadSchema }),
]);

export type GenerationEvent = z.infer<typeof GenerationEventSchema>;
