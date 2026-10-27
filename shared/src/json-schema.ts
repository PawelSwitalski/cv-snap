import { z } from "zod";
import { CvProfileExtractionSchema } from "./cv-profile.js";
import { JobRequirementsSchema } from "./job-requirements.js";
import { TailoringPlanSchema } from "./tailoring-plan.js";

/**
 * Schemas of what Claude must return, passed to `claude --json-schema` (spike 001: the most
 * reliable structured-output method). Refinements are not part of JSON Schema; they run in zod
 * after parsing. The profile schema carries no IDs: code assigns them (`assignProfileIds`).
 */
export const AI_OUTPUT_SCHEMAS = {
  profile: CvProfileExtractionSchema,
  requirements: JobRequirementsSchema,
  plan: TailoringPlanSchema,
} as const;

export type AiOutputKind = keyof typeof AI_OUTPUT_SCHEMAS;

/** JSON Schema for one AI output, without the `$schema` meta key. Throws if not representable. */
export function toClaudeJsonSchema(kind: AiOutputKind): Record<string, unknown> {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(AI_OUTPUT_SCHEMAS[kind], {
    unrepresentable: "throw",
  });
  delete jsonSchema.$schema;
  return jsonSchema;
}
