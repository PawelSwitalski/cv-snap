import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOST_VERSION } from "./version.js";

describe("HOST_VERSION", () => {
  it("matches the native-host package.json version", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      version: string;
    };

    expect(HOST_VERSION).toBe(pkg.version);
  });
});
