import { z } from "zod";

/** Claude models selectable in settings (FR-20). Passed to Claude Code via `--model`. */
export const MODEL_IDS = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"] as const;

export const ModelIdSchema = z.enum(MODEL_IDS);

export type ModelId = z.infer<typeof ModelIdSchema>;

export const DEFAULT_MODEL: ModelId = "claude-sonnet-5-5";
