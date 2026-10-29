import type { ErrorPayload, ProgressStep } from "@cv-snap/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeConnector, generationResult } from "../../../test/generate-fixtures";
import type { GenerationResult } from "@/features/generation/generation-result";
import type { GenerateMessage } from "@/features/generation/messages";
import { CLIENT_WATCHDOG_MS, runGeneration } from "./generation-client";

const message: GenerateMessage = {
  type: "generate",
  tabId: 7,
  override: "en",
  model: "claude-sonnet-5-5",
};

function recorder() {
  const steps: ProgressStep[] = [];
  const results: GenerationResult[] = [];
  const errors: ErrorPayload[] = [];
  return {
    steps,
    results,
    errors,
    handlers: {
      onProgress: (step: ProgressStep) => steps.push(step),
      onResult: (result: GenerationResult) => results.push(result),
      onError: (error: ErrorPayload) => errors.push(error),
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("runGeneration", () => {
  it("sends the request, reports progress and ends with one result", () => {
    const connector = fakeConnector();
    const record = recorder();
    runGeneration(connector.connect, message, record.handlers);
    const port = connector.last();

    port.emit({ type: "progress", step: "tailoring" });
    port.emit({ type: "result", result: generationResult() });
    port.emit({ type: "error", error: { code: "GENERATION_FAILED", message: "late" } });

    expect(port.posted).toEqual([message]);
    expect(record.steps).toEqual(["tailoring"]);
    expect(record.results).toHaveLength(1);
    expect(record.errors).toEqual([]);
    expect(port.state.isDisconnected).toBe(true);
  });

  it("passes the background's typed error through", () => {
    const connector = fakeConnector();
    const record = recorder();
    runGeneration(connector.connect, message, record.handlers);

    connector.last().emit({
      type: "error",
      error: { code: "GENERATION_TIMEOUT", message: "Generation took too long" },
    });

    expect(record.errors).toEqual([
      { code: "GENERATION_TIMEOUT", message: "Generation took too long" },
    ]);
  });

  it("turns a port that closes without an answer into HOST_DISCONNECTED", () => {
    const connector = fakeConnector();
    const record = recorder();
    runGeneration(connector.connect, message, record.handlers);

    connector.last().drop();

    expect(record.errors.map((error) => error.code)).toEqual(["HOST_DISCONNECTED"]);
  });

  it("cancels by closing the port and reports nothing afterwards", () => {
    const connector = fakeConnector();
    const record = recorder();
    const run = runGeneration(connector.connect, message, record.handlers);
    const port = connector.last();

    run.cancel();
    port.emit({ type: "result", result: generationResult() });
    port.drop();

    expect(port.state.isDisconnected).toBe(true);
    expect(record.results).toEqual([]);
    expect(record.errors).toEqual([]);
  });

  it("ignores malformed events", () => {
    const connector = fakeConnector();
    const record = recorder();
    runGeneration(connector.connect, message, record.handlers);

    connector.last().emit({ type: "progress", step: "hacking" });
    connector.last().emit({ type: "unknown" });

    expect(record.steps).toEqual([]);
    expect(record.errors).toEqual([]);
  });

  it("leaves the loading state on its own watchdog when nothing answers", () => {
    vi.useFakeTimers();
    const connector = fakeConnector();
    const record = recorder();
    runGeneration(connector.connect, message, record.handlers);

    vi.advanceTimersByTime(CLIENT_WATCHDOG_MS);

    expect(record.errors.map((error) => error.code)).toEqual(["GENERATION_TIMEOUT"]);
    expect(connector.last().state.isDisconnected).toBe(true);
  });

  it("reports HOST_DISCONNECTED when the background can't be reached at all", () => {
    const record = recorder();

    runGeneration(
      () => {
        throw new Error("Could not establish connection");
      },
      message,
      record.handlers,
    );

    expect(record.errors.map((error) => error.code)).toEqual(["HOST_DISCONNECTED"]);
  });
});
