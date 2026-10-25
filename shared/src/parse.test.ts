import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseWithReadableError } from "./parse.js";

describe("parseWithReadableError", () => {
  const schema = z.object({ name: z.string(), age: z.number().int() });

  it("returns the parsed data on success", () => {
    expect(parseWithReadableError(schema, { name: "a", age: 3 })).toEqual({
      ok: true,
      data: { name: "a", age: 3 },
    });
  });

  it("returns one readable line per issue, with the path, on failure", () => {
    const result = parseWithReadableError(schema, { name: 1, age: 1.5 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("name");
      expect(result.message).toContain("age");
      expect(result.message.split("\n").length).toBeGreaterThanOrEqual(2);
    }
  });
});
