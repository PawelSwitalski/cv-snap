import {
  CvSnapError,
  HostFrameSchema,
  NATIVE_HOST_NAME,
  RESPONSE_DATA_SCHEMAS,
  type ErrorCode,
  type NativeRequest,
  type ProgressStep,
  type ResponseData,
} from "@cv-snap/shared";
import { logger } from "@/lib/logger";

/** The subset of `chrome.runtime.Port` the client uses (lets tests pass a fake port). */
export interface NativePort {
  postMessage(message: unknown): void;
  disconnect(): void;
  onMessage: { addListener(callback: (message: unknown) => void): void };
  onDisconnect: { addListener(callback: () => void): void };
}

export interface NativeHostClientDeps {
  connect: () => NativePort;
  /** Reads `runtime.lastError` inside `onDisconnect`; it explains why the port closed. */
  lastErrorMessage: () => string | undefined;
  newRequestId: () => string;
}

type RequestType = keyof ResponseData;
type RequestPayload<K extends RequestType> = Omit<Extract<NativeRequest, { type: K }>, "requestId">;

export interface RequestOptions {
  signal?: AbortSignal;
  onProgress?: (step: ProgressStep) => void;
}

interface Pending {
  type: RequestType;
  resolve: (data: unknown) => void;
  reject: (error: CvSnapError) => void;
  onProgress: ((step: ProgressStep) => void) | undefined;
}

const defaultDeps: NativeHostClientDeps = {
  connect: () => browser.runtime.connectNative(NATIVE_HOST_NAME),
  lastErrorMessage: () => browser.runtime.lastError?.message,
  newRequestId: () => crypto.randomUUID(),
};

/**
 * Maps the reason Chrome gives for a closed native port to an error code. Chrome reports a missing
 * or misregistered host (wrong `allowed_origins`) with these messages.
 */
export function disconnectErrorCode(message: string | undefined): ErrorCode {
  if (message && /not found|forbidden/i.test(message)) return "HOST_NOT_INSTALLED";
  return "HOST_DISCONNECTED";
}

/**
 * Long-lived connection to the native host (one port, many requests by `requestId`). Replies are
 * validated against the shared schemas before they are returned. Reconnects on the next request
 * after a disconnect.
 */
export function createNativeHostClient(overrides: Partial<NativeHostClientDeps> = {}) {
  const deps: NativeHostClientDeps = { ...defaultDeps, ...overrides };
  const pending = new Map<string, Pending>();
  let port: NativePort | null = null;

  const failAll = (code: ErrorCode, message: string) => {
    for (const entry of pending.values()) entry.reject(new CvSnapError(code, message));
    pending.clear();
  };

  const handleMessage = (message: unknown) => {
    const frame = HostFrameSchema.safeParse(message);
    if (!frame.success) {
      logger.warn("ignored malformed frame from native host");
      return;
    }
    const entry = pending.get(frame.data.requestId);
    if (!entry) return; // e.g. the CANCELLED reply of a request already rejected locally
    if (frame.data.type === "progress") {
      entry.onProgress?.(frame.data.step);
      return;
    }
    pending.delete(frame.data.requestId);
    const { response } = frame.data;
    if (!response.ok) {
      entry.reject(new CvSnapError(response.error.code, response.error.message, response.error));
      return;
    }
    const data = RESPONSE_DATA_SCHEMAS[entry.type].safeParse(response.data);
    if (data.success) entry.resolve(data.data);
    else entry.reject(new CvSnapError("INVALID_MESSAGE", "Native host sent an invalid reply"));
  };

  const ensurePort = (): NativePort => {
    if (port) return port;
    const connected = deps.connect();
    connected.onMessage.addListener(handleMessage);
    connected.onDisconnect.addListener(() => {
      const reason = deps.lastErrorMessage();
      const code = disconnectErrorCode(reason);
      logger.warn("native host disconnected", code);
      if (port === connected) port = null;
      failAll(code, reason ?? "Native host disconnected");
    });
    port = connected;
    return connected;
  };

  return {
    request<K extends RequestType>(
      payload: RequestPayload<K>,
      options: RequestOptions = {},
    ): Promise<ResponseData[K]> {
      const requestId = deps.newRequestId();
      return new Promise<ResponseData[K]>((resolve, reject) => {
        const { signal } = options;
        if (signal?.aborted) {
          reject(new CvSnapError("CANCELLED", "Request was cancelled"));
          return;
        }
        const target = ensurePort();
        pending.set(requestId, {
          type: payload.type,
          resolve: resolve as (data: unknown) => void,
          reject,
          onProgress: options.onProgress,
        });
        signal?.addEventListener(
          "abort",
          () => {
            if (!pending.delete(requestId)) return;
            target.postMessage({ type: "cancel", requestId });
            reject(new CvSnapError("CANCELLED", "Request was cancelled"));
          },
          { once: true },
        );
        target.postMessage({ ...payload, requestId });
      });
    },
    disconnect(): void {
      port?.disconnect();
      port = null;
      failAll("HOST_DISCONNECTED", "Disconnected by the extension");
    },
  };
}

export type NativeHostClient = ReturnType<typeof createNativeHostClient>;
