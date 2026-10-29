import { describe, expect, it } from "vitest";
import { HEALTHY, healthClient, silentClient } from "../../../test/panel-fixtures";
import { isSetupBlocked, runSetupCheck } from "./setup-check";

describe("runSetupCheck", () => {
  it("reports no issues for a healthy setup", async () => {
    const result = await runSetupCheck(() => healthClient({ report: HEALTHY }));

    expect(result.issues).toEqual([]);
    expect(isSetupBlocked(result)).toBe(false);
  });

  it.each([
    [{ claudeFound: false, isAuthenticated: false, isVersionSupported: false }, "CLAUDE_NOT_FOUND"],
    [{ isAuthenticated: false }, "CLAUDE_NOT_AUTHENTICATED"],
  ] as const)("blocks on %j with %s", async (patch, code) => {
    const result = await runSetupCheck(() => healthClient({ report: { ...HEALTHY, ...patch } }));

    expect(result.issues).toEqual([{ code, severity: "error" }]);
    expect(isSetupBlocked(result)).toBe(true);
  });

  it("only warns about an outdated Claude Code", async () => {
    const result = await runSetupCheck(() =>
      healthClient({ report: { ...HEALTHY, isVersionSupported: false } }),
    );

    expect(result.issues).toEqual([{ code: "CLAUDE_VERSION_UNSUPPORTED", severity: "warning" }]);
    expect(isSetupBlocked(result)).toBe(false);
  });

  it("warns, without blocking, when the host's major or minor version differs", async () => {
    const result = await runSetupCheck(
      () => healthClient({ report: { ...HEALTHY, hostVersion: "0.2.0" } }),
      undefined,
      "0.1.0",
    );

    expect(result.issues).toEqual([{ code: "HOST_VERSION_MISMATCH", severity: "warning" }]);
    expect(isSetupBlocked(result)).toBe(false);
  });

  it("accepts a host that differs only in the patch version", async () => {
    const result = await runSetupCheck(
      () => healthClient({ report: { ...HEALTHY, hostVersion: "0.1.4" } }),
      undefined,
      "0.1.0",
    );

    expect(result.issues).toEqual([]);
  });

  it("reports HOST_NOT_INSTALLED when Chrome can't find the host", async () => {
    const result = await runSetupCheck(() =>
      healthClient({ lastError: "Specified native messaging host not found." }),
    );

    expect(result.issues).toEqual([{ code: "HOST_NOT_INSTALLED", severity: "error" }]);
  });

  it("reports HOST_DISCONNECTED when the host exits", async () => {
    const result = await runSetupCheck(() =>
      healthClient({ lastError: "Native host has exited." }),
    );

    expect(result.issues).toEqual([{ code: "HOST_DISCONNECTED", severity: "error" }]);
  });

  it("uses a fresh connection each time and closes it afterwards", async () => {
    let created = 0;
    let disconnected = 0;
    const factory = () => {
      created++;
      const client = healthClient({ report: HEALTHY });
      return {
        ...client,
        disconnect: () => {
          disconnected++;
          client.disconnect();
        },
      };
    };

    await runSetupCheck(factory);
    await runSetupCheck(factory);

    expect([created, disconnected]).toEqual([2, 2]);
  });

  it("stops when cancelled", async () => {
    const controller = new AbortController();
    const pending = runSetupCheck(silentClient, controller.signal);
    controller.abort();

    expect((await pending).issues[0]?.severity).toBe("error");
  });
});
