import { describe, expect, it, vi } from "vitest";
import { findDuplicateIds, IdSchema, newId } from "./ids.js";

describe("newId", () => {
  it("creates prefixed ids that pass IdSchema", () => {
    const id = newId("exp");

    expect(id).toMatch(/^exp_[0-9a-z]{10}$/);
    expect(IdSchema.safeParse(id).success).toBe(true);
  });

  it("creates unique ids across many calls", () => {
    const ids = new Set(Array.from({ length: 5000 }, () => newId("b")));

    expect(ids.size).toBe(5000);
  });

  it("retries when the generated id already exists", () => {
    const spy = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementationOnce((array) => {
        (array as Uint8Array).fill(0);
        return array;
      })
      .mockImplementationOnce((array) => {
        (array as Uint8Array).fill(1);
        return array;
      });

    const id = newId("x", new Set(["x_0000000000"]));

    expect(id).toBe("x_1111111111");
    spy.mockRestore();
  });
});

describe("findDuplicateIds", () => {
  it("returns each duplicated id once, in first-seen order", () => {
    expect(findDuplicateIds(["a", "b", "a", "c", "b", "a"])).toEqual(["a", "b"]);
  });

  it("returns an empty list when all ids are unique", () => {
    expect(findDuplicateIds(["a", "b"])).toEqual([]);
  });
});
