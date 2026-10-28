import { CvSnapError, toErrorPayload } from "@cv-snap/shared";
import type { AdInput } from "@/features/tailoring/requirements-resolution";
import { logger } from "@/lib/logger";
import type { GenerationPipeline } from "./generation-pipeline";
import { GenerateMessageSchema, type GenerateMessage, type GenerationEvent } from "./messages";

/** The subset of `chrome.runtime.Port` used here (tests pass a fake). */
export interface GenerationPort {
  postMessage(message: GenerationEvent): void;
  onMessage: { addListener(callback: (message: unknown) => void): void };
  onDisconnect: { addListener(callback: () => void): void };
}

export interface GenerationPortDeps {
  pipeline: Pick<GenerationPipeline, "run">;
  /** Captures the ad (or the user's selection) in the tab; throws a typed error otherwise. */
  captureAd: (tabId: number, signal: AbortSignal) => Promise<AdInput>;
}

/**
 * Serves one side-panel connection (story 007, ddd-02 decision 8): validates `generate`, runs the
 * pipeline with progress, answers with exactly one `result` or `error`. When the panel closes, the
 * port disconnects and the running generation is cancelled (FR-16). One run at a time per port.
 * Wired into the background worker together with the side panel (bolt 011).
 */
export function serveGenerationPort(port: GenerationPort, deps: GenerationPortDeps): void {
  let current: AbortController | null = null;
  let isConnected = true;
  const post = (event: GenerationEvent) => {
    if (isConnected) port.postMessage(event);
  };

  port.onDisconnect.addListener(() => {
    isConnected = false;
    current?.abort();
  });

  port.onMessage.addListener((message) => {
    const parsed = GenerateMessageSchema.safeParse(message);
    if (!parsed.success) {
      post({
        type: "error",
        error: { code: "INVALID_MESSAGE", message: "Unknown generation request" },
      });
      return;
    }
    if (current) {
      post({
        type: "error",
        error: { code: "INVALID_MESSAGE", message: "A generation is already running" },
      });
      return;
    }
    const controller = new AbortController();
    current = controller;
    void run(parsed.data, controller).finally(() => {
      if (current === controller) current = null;
    });
  });

  const run = async (request: GenerateMessage, controller: AbortController) => {
    try {
      post({ type: "progress", step: "reading-job-ad" });
      const ad = await deps.captureAd(request.tabId, controller.signal);
      if (controller.signal.aborted) throw new CvSnapError("CANCELLED", "Generation was cancelled");
      const result = await deps.pipeline.run({
        ad,
        override: request.override,
        model: request.model,
        signal: controller.signal,
        onProgress: (step) => {
          post({ type: "progress", step });
        },
      });
      post({ type: "result", result });
    } catch (error) {
      const payload = toErrorPayload(error);
      logger.warn("generation request failed", payload.code);
      post({ type: "error", error: payload });
    }
  };
}
