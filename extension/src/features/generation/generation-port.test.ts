import { CvSnapError } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { generationResult } from "../../../test/generate-fixtures";
import type { AdInput } from "@/features/tailoring/requirements-resolution";
import type { GenerationRequest } from "./generation-result";
import { serveGenerationPort, type GenerationPort } from "./generation-port";
import type { GenerationEvent } from "./messages";

const AD: AdInput = {
  text: "Senior Frontend Developer…",
  url: "https://jobs.example.com/1",
  structuredFields: null,
  isManualSelection: false,
};

/** Background end of the port: the test plays the side panel. */
function backgroundPort() {
  const messageListeners: ((message: unknown) => void)[] = [];
  const disconnectListeners: (() => void)[] = [];
  const events: GenerationEvent[] = [];
  const port: GenerationPort = {
    postMessage: (event) => events.push(event),
    onMessage: { addListener: (callback) => messageListeners.push(callback) },
    onDisconnect: { addListener: (callback) => disconnectListeners.push(callback) },
  };
  return {
    port,
    events,
    send: (message: unknown) => {
      for (const listener of messageListeners) listener(message);
    },
    close: () => {
      for (const listener of disconnectListeners) listener();
    },
  };
}

const generate = { type: "generate", tabId: 7, override: null, model: "claude-sonnet-5-5" };

/** Lets pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("serveGenerationPort", () => {
  it("captures the ad, reports progress and answers with exactly one result", async () => {
    const side = backgroundPort();
    const requests: GenerationRequest[] = [];
    serveGenerationPort(side.port, {
      captureAd: () => Promise.resolve(AD),
      pipeline: {
        run: (request) => {
          requests.push(request);
          request.onProgress?.("tailoring");
          return Promise.resolve(generationResult());
        },
      },
    });

    side.send(generate);
    await settle();

    expect(side.events.map((event) => event.type)).toEqual(["progress", "progress", "result"]);
    expect(side.events[0]).toEqual({ type: "progress", step: "reading-job-ad" });
    expect(requests[0]?.ad).toEqual(AD);
    expect(requests[0]?.override).toBeNull();
  });

  it("cancels the running generation when the panel disconnects", async () => {
    const side = backgroundPort();
    let signal: AbortSignal | undefined;
    serveGenerationPort(side.port, {
      captureAd: () => Promise.resolve(AD),
      pipeline: {
        run: (request) => {
          signal = request.signal;
          return new Promise((_, reject) => {
            request.signal.addEventListener("abort", () => {
              reject(new CvSnapError("CANCELLED", "cancelled"));
            });
          });
        },
      },
    });

    side.send(generate);
    await settle();
    side.close();
    await settle();

    expect(signal?.aborted).toBe(true);
    // Nothing is posted to a closed port.
    expect(side.events.map((event) => event.type)).toEqual(["progress"]);
  });

  it("answers a capture failure with its typed error", async () => {
    const side = backgroundPort();
    serveGenerationPort(side.port, {
      captureAd: () =>
        Promise.reject(
          new CvSnapError("JOB_AD_NOT_DETECTED", "none", { reason: "SELECTION_TOO_SHORT" }),
        ),
      pipeline: { run: () => Promise.reject(new Error("not reached")) },
    });

    side.send(generate);
    await settle();

    expect(side.events.at(-1)).toEqual({
      type: "error",
      error: { code: "JOB_AD_NOT_DETECTED", message: "none", reason: "SELECTION_TOO_SHORT" },
    });
  });

  it("rejects malformed requests and a second run on the same port", async () => {
    const side = backgroundPort();
    serveGenerationPort(side.port, {
      captureAd: () => Promise.resolve(AD),
      pipeline: { run: () => new Promise(() => undefined) },
    });

    side.send({ type: "generate", tabId: "7" });
    side.send(generate);
    side.send(generate);
    await settle();

    const errors = side.events.filter((event) => event.type === "error");
    expect(errors).toHaveLength(2);
    expect(errors.every((event) => event.error.code === "INVALID_MESSAGE")).toBe(true);
  });

  it("never leaks internal error details", async () => {
    const side = backgroundPort();
    serveGenerationPort(side.port, {
      captureAd: () => Promise.resolve(AD),
      pipeline: { run: () => Promise.reject(new Error("stack with CV text Jan Testowy")) },
    });

    side.send(generate);
    await settle();

    expect(JSON.stringify(side.events)).not.toContain("Jan Testowy");
    expect(side.events.at(-1)).toMatchObject({
      type: "error",
      error: { code: "GENERATION_FAILED" },
    });
  });
});
