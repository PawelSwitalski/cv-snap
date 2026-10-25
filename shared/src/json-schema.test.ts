import { describe, expect, it } from "vitest";
import { AI_OUTPUT_SCHEMAS, toClaudeJsonSchema, type AiOutputKind } from "./json-schema.js";

const kinds = Object.keys(AI_OUTPUT_SCHEMAS) as AiOutputKind[];

describe("toClaudeJsonSchema", () => {
  it.each(kinds)("converts the %s schema to a plain JSON Schema object", (kind) => {
    const schema = toClaudeJsonSchema(kind);

    expect(schema.type).toBe("object");
    expect(schema).not.toHaveProperty("$schema");
    expect(() => JSON.stringify(schema)).not.toThrow();
  });

  it.each(kinds)("makes every property of the %s top level required", (kind) => {
    const schema = toClaudeJsonSchema(kind) as {
      properties: Record<string, unknown>;
      required: string[];
    };

    expect([...schema.required].sort()).toEqual(Object.keys(schema.properties).sort());
  });

  it("requires at least one sourceId for plan lines", () => {
    const schema = toClaudeJsonSchema("plan") as {
      properties: { summary: { items: { properties: { sourceIds: { minItems: number } } } } };
    };

    expect(schema.properties.summary.items.properties.sourceIds.minItems).toBe(1);
  });

  it("lets the model answer null for facts the ad may not state", () => {
    const schema = toClaudeJsonSchema("requirements") as {
      properties: { company: { type: string[] } };
    };

    expect(schema.properties.company.type).toEqual(["string", "null"]);
  });

  it("keeps the CLI argument small enough for the Windows command line", () => {
    // JSON Schema goes on argv (--json-schema); Windows caps the whole command line at ~32 KB.
    for (const kind of kinds) {
      expect(JSON.stringify(toClaudeJsonSchema(kind)).length).toBeLessThan(16_000);
    }
  });
});
