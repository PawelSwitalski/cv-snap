import type { ProgressStep } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { createNativeHostClient, disconnectErrorCode, type NativePort } from "./native-host-client";

const HEALTHY = {
  hostVersion: "0.1.0",
  claudeFound: true,
  claudeVersion: "2.1.302",
  isAuthenticated: true,
  isVersionSupported: true,
};

/** Fake Chrome port: records posted messages and lets the test play the host. */
function fakeChrome() {
  const ports: {
    posted: unknown[];
    reply: (frame: unknown) => void;
    drop: () => void;
  }[] = [];
  let lastError: string | undefined;
  let nextId = 0;
  const connect = (): NativePort => {
    const messageListeners: ((message: unknown) => void)[] = [];
    const disconnectListeners: (() => void)[] = [];
    const posted: unknown[] = [];
    ports.push({
      posted,
      reply: (frame) => {
        for (const listener of messageListeners) listener(frame);
      },
      drop: () => {
        for (const listener of disconnectListeners) listener();
      },
    });
    return {
      postMessage: (message) => posted.push(message),
      disconnect: () => undefined,
      onMessage: { addListener: (callback) => messageListeners.push(callback) },
      onDisconnect: { addListener: (callback) => disconnectListeners.push(callback) },
    };
  };
  const client = createNativeHostClient({
    connect,
    lastErrorMessage: () => lastError,
    newRequestId: () => `r${String(++nextId)}`,
  });
  return {
    client,
    ports,
    setLastError: (message: string | undefined) => (lastError = message),
  };
}

describe("createNativeHostClient", () => {
  it("sends the request with a requestId and resolves with validated data", async () => {
    const chrome = fakeChrome();

    const pending = chrome.client.request({ type: "health" });
    chrome.ports[0]?.reply({
      type: "response",
      requestId: "r1",
      response: { ok: true, data: HEALTHY },
    });

    await expect(pending).resolves.toEqual(HEALTHY);
    expect(chrome.ports[0]?.posted).toEqual([{ type: "health", requestId: "r1" }]);
  });

  it("delivers progress frames to the callback before resolving", async () => {
    const chrome = fakeChrome();
    const steps: ProgressStep[] = [];

    const pending = chrome.client.request(
      { type: "health" },
      { onProgress: (step) => steps.push(step) },
    );
    chrome.ports[0]?.reply({ type: "progress", requestId: "r1", step: "tailoring" });
    chrome.ports[0]?.reply({
      type: "response",
      requestId: "r1",
      response: { ok: true, data: HEALTHY },
    });

    await pending;
    expect(steps).toEqual(["tailoring"]);
  });

  it("rejects with the host's error code", async () => {
    const chrome = fakeChrome();

    const pending = chrome.client.request({ type: "health" });
    chrome.ports[0]?.reply({
      type: "response",
      requestId: "r1",
      response: { ok: false, error: { code: "MODEL_UNAVAILABLE", message: "no access" } },
    });

    await expect(pending).rejects.toMatchObject({
      code: "MODEL_UNAVAILABLE",
      message: "no access",
    });
  });

  it("rejects a reply whose data doesn't match the schema", async () => {
    const chrome = fakeChrome();

    const pending = chrome.client.request({ type: "health" });
    chrome.ports[0]?.reply({
      type: "response",
      requestId: "r1",
      response: { ok: true, data: { x: 1 } },
    });

    await expect(pending).rejects.toMatchObject({ code: "INVALID_MESSAGE" });
  });

  it("ignores malformed frames and replies for unknown requests", async () => {
    const chrome = fakeChrome();

    const pending = chrome.client.request({ type: "health" });
    chrome.ports[0]?.reply("garbage");
    chrome.ports[0]?.reply({
      type: "response",
      requestId: "other",
      response: { ok: true, data: {} },
    });
    chrome.ports[0]?.reply({
      type: "response",
      requestId: "r1",
      response: { ok: true, data: HEALTHY },
    });

    await expect(pending).resolves.toEqual(HEALTHY);
  });

  it("sends cancel to the host and rejects with CANCELLED when aborted", async () => {
    const chrome = fakeChrome();
    const controller = new AbortController();

    const pending = chrome.client.request({ type: "health" }, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: "CANCELLED" });
    expect(chrome.ports[0]?.posted).toContainEqual({ type: "cancel", requestId: "r1" });
  });

  it("rejects at once without contacting the host when the signal is already aborted", async () => {
    const chrome = fakeChrome();
    const controller = new AbortController();
    controller.abort();

    await expect(
      chrome.client.request({ type: "health" }, { signal: controller.signal }),
    ).rejects.toMatchObject({ code: "CANCELLED" });
    expect(chrome.ports).toHaveLength(0);
  });

  it("reports HOST_NOT_INSTALLED when Chrome can't find the host", async () => {
    const chrome = fakeChrome();

    const pending = chrome.client.request({ type: "health" });
    chrome.setLastError("Specified native messaging host not found.");
    chrome.ports[0]?.drop();

    await expect(pending).rejects.toMatchObject({ code: "HOST_NOT_INSTALLED" });
  });

  it("reports HOST_DISCONNECTED when the host exits, and reconnects on the next request", async () => {
    const chrome = fakeChrome();

    const first = chrome.client.request({ type: "health" });
    chrome.setLastError("Native host has exited.");
    chrome.ports[0]?.drop();
    await expect(first).rejects.toMatchObject({ code: "HOST_DISCONNECTED" });

    const second = chrome.client.request({ type: "health" });
    chrome.ports[1]?.reply({
      type: "response",
      requestId: "r2",
      response: { ok: true, data: HEALTHY },
    });

    await expect(second).resolves.toEqual(HEALTHY);
    expect(chrome.ports).toHaveLength(2);
  });

  it("rejects pending requests when the extension disconnects", async () => {
    const chrome = fakeChrome();

    const pending = chrome.client.request({ type: "health" });
    chrome.client.disconnect();

    await expect(pending).rejects.toMatchObject({ code: "HOST_DISCONNECTED" });
  });
});

describe("disconnectErrorCode", () => {
  it.each([
    ["Specified native messaging host not found.", "HOST_NOT_INSTALLED"],
    ["Access to the specified native messaging host is forbidden.", "HOST_NOT_INSTALLED"],
    ["Native host has exited.", "HOST_DISCONNECTED"],
    ["Error when communicating with the native messaging host.", "HOST_DISCONNECTED"],
    [undefined, "HOST_DISCONNECTED"],
  ])("maps %j to %s", (message, code) => {
    expect(disconnectErrorCode(message)).toBe(code);
  });
});
