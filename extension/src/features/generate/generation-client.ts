import type { ErrorPayload, ProgressStep } from "@cv-snap/shared";
import { DEFAULT_WATCHDOG_MS } from "@/features/generation/generation-pipeline";
import type { GenerationResult } from "@/features/generation/generation-result";
import {
  GENERATION_PORT_NAME,
  GenerationEventSchema,
  type GenerateMessage,
} from "@/features/generation/messages";
import { logger } from "@/lib/logger";

/** The subset of the panel's `chrome.runtime.Port` used here (tests pass a fake). */
export interface ClientPort {
  postMessage(message: GenerateMessage): void;
  onMessage: { addListener(callback: (message: unknown) => void): void };
  onDisconnect: { addListener(callback: () => void): void };
  disconnect(): void;
}

export type ConnectGeneration = () => ClientPort;

export const connectGeneration: ConnectGeneration = () =>
  browser.runtime.connect({ name: GENERATION_PORT_NAME });

/**
 * Beyond the background's own watchdog: if even that never answers (worker killed), the panel
 * still leaves the loading state (FR-17).
 */
export const CLIENT_WATCHDOG_MS = DEFAULT_WATCHDOG_MS + 15_000;

export interface GenerationHandlers {
  onProgress(step: ProgressStep): void;
  onResult(result: GenerationResult): void;
  onError(error: ErrorPayload): void;
}

export interface RunningGeneration {
  /** Stops the run: the port closes, the background aborts, the host kills `claude` (FR-16). */
  cancel(): void;
}

/**
 * One generation over its own port (story 005): progress events, then exactly one `onResult` or
 * `onError`. A port that closes without an answer is a lost connection; `cancel` reports nothing
 * (cancelling is not an error), so the UI can return to ready at once.
 */
export function runGeneration(
  connect: ConnectGeneration,
  message: GenerateMessage,
  handlers: GenerationHandlers,
  watchdogMs: number = CLIENT_WATCHDOG_MS,
): RunningGeneration {
  let isDone = false;
  let port: ClientPort | null = null;
  const finish = () => {
    if (isDone) return false;
    isDone = true;
    clearTimeout(watchdog);
    port?.disconnect();
    return true;
  };
  const fail = (error: ErrorPayload) => {
    if (finish()) handlers.onError(error);
  };
  const watchdog = setTimeout(() => {
    fail({ code: "GENERATION_TIMEOUT", message: "No answer from the background worker" });
  }, watchdogMs);

  try {
    port = connect();
  } catch (error) {
    logger.warn("generation port not opened", error instanceof Error ? error.name : "unknown");
    fail({ code: "HOST_DISCONNECTED", message: "The background worker is not reachable" });
    return { cancel: finish };
  }
  port.onMessage.addListener((raw) => {
    if (isDone) return;
    const parsed = GenerationEventSchema.safeParse(raw);
    if (!parsed.success) {
      logger.warn("ignored malformed generation event");
      return;
    }
    const event = parsed.data;
    if (event.type === "progress") {
      handlers.onProgress(event.step);
    } else if (event.type === "error") {
      fail(event.error);
    } else if (finish()) {
      // Produced by our own background worker from validated parts; not re-parsed here.
      handlers.onResult(event.result as GenerationResult);
    }
  });
  port.onDisconnect.addListener(() => {
    fail({ code: "HOST_DISCONNECTED", message: "The generation connection closed" });
  });
  port.postMessage(message);
  return {
    cancel: () => {
      finish();
    },
  };
}
