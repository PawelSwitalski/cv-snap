import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";
import { handleActionClick, type ActionClickApis } from "./action-click";

function fakeApis(overrides: Partial<ActionClickApis> = {}) {
  const calls: string[] = [];
  const apis: ActionClickApis = {
    openPanel: vi.fn((windowId: number) => {
      calls.push(`open:${String(windowId)}`);
      return Promise.resolve();
    }),
    sendToPanel: vi.fn((message: { type: string }) => {
      calls.push(`send:${message.type}`);
      return Promise.resolve();
    }),
    ...overrides,
  };
  return { apis, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleActionClick", () => {
  it("opens the panel for the click's window before anything is awaited", () => {
    const { apis, calls } = fakeApis();

    void handleActionClick(apis, 4);

    // Synchronously, still inside the click's user gesture.
    expect(calls).toEqual(["open:4"]);
  });

  it("then tells the panel to read the page again", async () => {
    const { apis, calls } = fakeApis();

    await handleActionClick(apis, 4);

    expect(calls).toEqual(["open:4", "send:page-access-changed"]);
  });

  it("ignores a missing receiver (the panel is still starting)", async () => {
    const { apis } = fakeApis({
      sendToPanel: () =>
        Promise.reject(new Error("Could not establish connection. Receiving end does not exist.")),
    });
    const error = vi.spyOn(logger, "error").mockImplementation(() => undefined);

    await expect(handleActionClick(apis, 4)).resolves.toBeUndefined();
    expect(error).not.toHaveBeenCalled();
  });

  it("logs a failed open without throwing and sends nothing", async () => {
    const { apis, calls } = fakeApis({
      openPanel: () => Promise.reject(new Error("No active side panel")),
    });
    const error = vi.spyOn(logger, "error").mockImplementation(() => undefined);

    await expect(handleActionClick(apis, 4)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith("sidePanel.open failed", expect.any(Error));
    expect(calls).toEqual([]);
  });
});
