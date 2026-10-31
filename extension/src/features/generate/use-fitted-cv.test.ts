import { describe, expect, it } from "vitest";
import { describeRenderError } from "./use-fitted-cv";

describe("describeRenderError", () => {
  it("keeps a WebAssembly error's message (it names the engine failure, not CV text)", () => {
    const blocked = new WebAssembly.RuntimeError("Aborted(CompileError: violates CSP)");

    expect(describeRenderError(blocked)).toBe("RuntimeError: Aborted(CompileError: violates CSP)");
    expect(describeRenderError(new WebAssembly.CompileError("bad module"))).toBe(
      "CompileError: bad module",
    );
  });

  it("keeps only the name of other errors, whose message may quote the CV", () => {
    expect(describeRenderError(new TypeError("Jan Kowalski, ul. Polna 1"))).toBe("TypeError");
    expect(describeRenderError("text")).toBe("unknown");
  });
});
