import type { Readable, Writable } from "node:stream";
import {
  MAX_OUTBOUND_MESSAGE_BYTES,
  parseNativeRequest,
  toErrorPayload,
  type ErrorPayload,
  type HostFrame,
  type NativeRequest,
  type ProgressStep,
  type ResponseData,
} from "@cv-snap/shared";
import type { Logger } from "../lib/logger.js";
import { encodeFrame, FrameDecoder } from "./framing.js";

/** Used in replies to frames whose `requestId` couldn't be read (oversized or not JSON). */
export const UNKNOWN_REQUEST_ID = "unknown";

export interface HandlerContext {
  /** Aborted on `cancel` for this request or when the extension disconnects. */
  signal: AbortSignal;
  progress: (step: ProgressStep) => void;
}

type HandledType = keyof ResponseData;

export type RequestHandlers = {
  [K in HandledType]?: (
    request: Extract<NativeRequest, { type: K }>,
    context: HandlerContext,
  ) => Promise<ResponseData[K]>;
};

export interface RunHostOptions {
  input: Readable;
  output: Writable;
  handlers: RequestHandlers;
  logger: Logger;
}

/**
 * Runs the native-messaging loop until `input` ends (the extension disconnected). Never throws:
 * every failure becomes an `{ ok: false }` reply. Only protocol frames are written to `output`.
 */
export function runHost({ input, output, handlers, logger }: RunHostOptions): Promise<void> {
  const decoder = new FrameDecoder();
  const running = new Map<string, { controller: AbortController; done: Promise<void> }>();
  let isClosed = false;

  const send = (frame: HostFrame) => {
    if (isClosed) return;
    let encoded = encodeFrame(frame);
    if (encoded.jsonBytes >= MAX_OUTBOUND_MESSAGE_BYTES) {
      logger.error("outbound message too large", {
        requestId: frame.requestId,
        bytes: encoded.jsonBytes,
      });
      encoded = encodeFrame({
        type: "response",
        requestId: frame.requestId,
        response: {
          ok: false,
          error: { code: "MESSAGE_TOO_LARGE", message: "Reply exceeds the 1 MB limit" },
        },
      } satisfies HostFrame);
    }
    output.write(encoded.frame);
  };

  const replyError = (requestId: string, error: ErrorPayload) => {
    send({ type: "response", requestId, response: { ok: false, error } });
  };

  const handleMessage = (value: unknown) => {
    const parsed = parseNativeRequest(value);
    if (!parsed.ok) {
      const requestId = readRequestId(value);
      logger.warn("invalid message", { requestId, code: parsed.error.code });
      replyError(requestId, parsed.error);
      return;
    }
    const request = parsed.data;
    if (request.type === "cancel") {
      const target = running.get(request.requestId);
      logger.info("cancel", { requestId: request.requestId, isRunning: target !== undefined });
      target?.controller.abort();
      return;
    }
    if (running.has(request.requestId)) {
      replyError(request.requestId, {
        code: "INVALID_MESSAGE",
        message: "requestId is already in use by a running request",
      });
      return;
    }
    const controller = new AbortController();
    const done = execute(request, controller.signal).finally(() => {
      running.delete(request.requestId);
    });
    running.set(request.requestId, { controller, done });
  };

  const execute = async (
    request: Exclude<NativeRequest, { type: "cancel" }>,
    signal: AbortSignal,
  ) => {
    const startedAt = Date.now();
    const { requestId, type } = request;
    const handler = handlers[type] as
      ((request: NativeRequest, context: HandlerContext) => Promise<unknown>) | undefined;
    if (!handler) {
      replyError(requestId, {
        code: "INVALID_MESSAGE",
        message: `Request type "${type}" is not supported by this host version`,
      });
      return;
    }
    logger.info("request started", { requestId, type });
    const progress = (step: ProgressStep) => {
      if (!signal.aborted) send({ type: "progress", requestId, step });
    };
    let reply: HostFrame;
    try {
      const data = await handler(request, { signal, progress });
      reply = signal.aborted
        ? cancelledReply(requestId)
        : { type: "response", requestId, response: { ok: true, data } };
    } catch (error) {
      reply = signal.aborted
        ? cancelledReply(requestId)
        : { type: "response", requestId, response: { ok: false, error: toErrorPayload(error) } };
    }
    const outcome =
      reply.type === "response" && !reply.response.ok ? reply.response.error.code : "ok";
    logger.info("request finished", {
      requestId,
      type,
      outcome,
      durationMs: Date.now() - startedAt,
    });
    send(reply);
  };

  return new Promise((resolve) => {
    input.on("data", (chunk: Buffer) => {
      for (const frame of decoder.push(chunk)) {
        try {
          if (frame.kind === "message") handleMessage(frame.value);
          else replyError(UNKNOWN_REQUEST_ID, frame.error);
        } catch (error) {
          // Defensive: dispatch itself must never take the host down.
          logger.error("dispatch failed", { code: toErrorPayload(error).code });
          replyError(UNKNOWN_REQUEST_ID, toErrorPayload(error));
        }
      }
    });
    const shutdown = () => {
      if (isClosed) return;
      isClosed = true;
      logger.info("input closed, shutting down", {
        runningRequests: running.size,
        pendingBytes: decoder.pendingBytes,
      });
      const pending = [...running.values()];
      for (const { controller } of pending) controller.abort();
      void Promise.allSettled(pending.map(({ done }) => done)).then(() => {
        resolve();
      });
    };
    input.on("end", shutdown);
    input.on("close", shutdown);
    input.on("error", (error) => {
      logger.error("input error", { code: toErrorPayload(error).code });
      shutdown();
    });
  });
}

function cancelledReply(requestId: string): HostFrame {
  return {
    type: "response",
    requestId,
    response: { ok: false, error: { code: "CANCELLED", message: "Request was cancelled" } },
  };
}

function readRequestId(value: unknown): string {
  if (typeof value === "object" && value !== null && "requestId" in value) {
    const { requestId } = value;
    if (typeof requestId === "string" && requestId.length > 0 && requestId.length <= 64) {
      return requestId;
    }
  }
  return UNKNOWN_REQUEST_ID;
}
