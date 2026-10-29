import {
  CvProfileContentSchema,
  CvSnapError,
  type CvProfileContent,
  type HealthReport,
} from "@cv-snap/shared";
import {
  createNativeHostClient,
  type NativeHostClient,
  type NativePort,
} from "@/lib/native-host-client";
import { smallProfile } from "./cv-fixtures";

/**
 * Side-panel test helpers (bolt 010): synthetic data only. A fictional profile, PDF/JPG/PNG blobs
 * with real magic bytes, and fake native-host connections that answer like the host.
 */

/** The fictional profile as reviewable draft content (no persistence fields). */
export function draftContent(): CvProfileContent {
  return CvProfileContentSchema.parse(smallProfile());
}

const PDF_HEAD = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]; // "%PDF-1.7\n"

/** A file that passes the PDF signature check (`size` pads the content). */
export function pdfFile(name = "cv.pdf", size = 64): File {
  const bytes = new Uint8Array(Math.max(size, PDF_HEAD.length));
  bytes.set(PDF_HEAD);
  return new File([bytes], name, { type: "application/pdf" });
}

export function bytesFile(bytes: number[], name: string, type: string, size = 64): File {
  const content = new Uint8Array(Math.max(size, bytes.length));
  content.set(bytes);
  return new File([content], name, { type });
}

export const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
export const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];

export const HEALTHY: HealthReport = {
  hostVersion: "0.1.0",
  claudeFound: true,
  claudeVersion: "2.1.302",
  isAuthenticated: true,
  isVersionSupported: true,
};

/** A health-check connection that answers `report`, or disconnects with `lastError`. */
export function healthClient(
  outcome: { report: HealthReport } | { lastError: string },
): NativeHostClient {
  const messageListeners: ((message: unknown) => void)[] = [];
  const disconnectListeners: (() => void)[] = [];
  const port: NativePort = {
    postMessage: (message) => {
      const { requestId } = message as { requestId: string };
      queueMicrotask(() => {
        if ("report" in outcome) {
          for (const listener of messageListeners) {
            listener({ type: "response", requestId, response: { ok: true, data: outcome.report } });
          }
        } else {
          for (const listener of disconnectListeners) listener();
        }
      });
    },
    disconnect: () => undefined,
    onMessage: { addListener: (callback) => messageListeners.push(callback) },
    onDisconnect: { addListener: (callback) => disconnectListeners.push(callback) },
  };
  return createNativeHostClient({
    connect: () => port,
    lastErrorMessage: () => ("lastError" in outcome ? outcome.lastError : undefined),
    newRequestId: () => crypto.randomUUID(),
  });
}

/** A client whose requests never answer (only cancellation ends them). */
export function silentClient(): NativeHostClient {
  const client: NativeHostClient = {
    request: (_payload, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => {
          reject(new CvSnapError("CANCELLED", "Request was cancelled"));
        });
      }),
    disconnect: () => undefined,
  };
  return client;
}
