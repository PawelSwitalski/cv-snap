import { DEV_EXTENSION_ID, originOf, type HealthReport } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { buildManifest, buildShellLauncher, buildWrapper } from "../install/install.js";
import { pathFor, type PlatformContext } from "../install/platform.js";
import { doctorExitCode, formatDoctor, runDoctor, type DoctorProbes } from "./doctor.js";

const HEALTHY: HealthReport = {
  hostVersion: "0.1.0",
  claudeFound: true,
  claudeVersion: "2.1.302",
  isAuthenticated: true,
  isVersionSupported: true,
};
const DEV_ORIGIN = originOf(DEV_EXTENSION_ID);
const STORE_ID = "abcdefghijklmnopabcdefghijklmnop";

/**
 * A healthy installation as files in memory, per OS, with the target OS's path separator (as
 * the code under test builds them), so every layout is testable on any machine.
 */
function installed(platform: PlatformContext["platform"] = "win32") {
  const { join } = pathFor(platform);
  const home = platform === "win32" ? "C:\\Users\\jan" : "/home/jan";
  const context: PlatformContext =
    platform === "win32"
      ? { platform, env: { LOCALAPPDATA: join(home, "AppData", "Local") }, home }
      : { platform, env: {}, home };
  const dataDir =
    platform === "win32"
      ? join(home, "AppData", "Local", "cv-snap")
      : platform === "darwin"
        ? join(home, "Library", "Application Support", "cv-snap")
        : join(home, ".local", "share", "cv-snap");
  const hostDir = join(dataDir, "host");
  const launcherPath = join(hostDir, platform === "win32" ? "cv-snap-host.cmd" : "cv-snap-host");
  const manifestPath =
    platform === "win32"
      ? join(hostDir, "com.cvsnap.host.json")
      : platform === "darwin"
        ? join(
            home,
            "Library",
            "Application Support",
            "Google",
            "Chrome",
            "NativeMessagingHosts",
            "com.cvsnap.host.json",
          )
        : join(home, ".config", "google-chrome", "NativeMessagingHosts", "com.cvsnap.host.json");
  const nodePath = join(home, "node", "node");
  const entryPath = join(hostDir, "runtime", "cv-snap-host.mjs");
  const files = new Map<string, string>([
    [manifestPath, JSON.stringify(buildManifest("com.cvsnap.host", launcherPath, [DEV_ORIGIN]))],
    [
      launcherPath,
      platform === "win32"
        ? buildWrapper(nodePath, entryPath)
        : buildShellLauncher(nodePath, entryPath),
    ],
    [entryPath, "// bundle"],
    [nodePath, "binary"],
    [join(hostDir, "runtime", "package.json"), JSON.stringify({ version: "0.1.0" })],
  ]);
  let registered: string | null = manifestPath;
  let health = HEALTHY;
  const probes: DoctorProbes = {
    context,
    nodeVersion: "26.12.1",
    hostVersion: "0.1.0",
    expectedOrigins: [DEV_ORIGIN],
    readFile: (path) => files.get(path) ?? null,
    exists: (path) => files.has(path),
    queryRegistry: () => Promise.resolve(registered),
    health: () => Promise.resolve(health),
  };
  return {
    probes,
    files,
    home,
    join,
    paths: { manifestPath, launcherPath, entryPath, nodePath },
    setRegistered: (value: string | null) => {
      registered = value;
    },
    setHealth: (patch: Partial<HealthReport>) => {
      health = { ...HEALTHY, ...patch };
    },
  };
}

const byName = (checks: Awaited<ReturnType<typeof runDoctor>>, name: string) =>
  checks.find((check) => check.name === name);

describe("runDoctor", () => {
  it.each(["win32", "darwin", "linux"] as const)(
    "passes every check on a healthy %s install",
    async (platform) => {
      const { probes } = installed(platform);

      const checks = await runDoctor(probes);

      expect(checks.map((check) => [check.name, check.status])).toEqual([
        ["Node", "pass"],
        ["Registration", "pass"],
        ["Allowed extensions", "pass"],
        ["Launcher", "pass"],
        ["Installed version", "pass"],
        ["Claude Code", "pass"],
        ["Claude Code login", "pass"],
      ]);
      expect(doctorExitCode(checks)).toBe(0);
    },
  );

  it("fails on Node older than 24", async () => {
    const { probes } = installed();

    const node = byName(await runDoctor({ ...probes, nodeVersion: "22.11.0" }), "Node");

    expect(node).toMatchObject({ status: "fail", detail: "22.11.0 (needs 24 or newer)" });
    expect(node?.fix).toContain("Install Node 24 or newer");
  });

  it("fails when the registry has no entry (Windows)", async () => {
    const setup = installed();
    setup.setRegistered(null);

    const checks = await runDoctor(setup.probes);

    const registration = byName(checks, "Registration");
    expect(registration).toMatchObject({ status: "fail", detail: "not registered" });
    expect(registration?.fix).toContain("npx cv-snap-host install");
    expect(doctorExitCode(checks)).toBe(1);
  });

  it("fails when the registry points to another manifest, comparing paths without case", async () => {
    const setup = installed();
    setup.setRegistered(setup.paths.manifestPath.toUpperCase());
    expect(byName(await runDoctor(setup.probes), "Registration")?.status).toBe("pass");

    setup.setRegistered(setup.join(setup.home, "old", "com.cvsnap.host.json"));
    const moved = byName(await runDoctor(setup.probes), "Registration");
    expect(moved?.status).toBe("fail");
    expect(moved?.detail).toContain("points to ~");
  });

  it("fails when Chrome's manifest file is missing (macOS, Linux)", async () => {
    const setup = installed("linux");
    setup.files.delete(setup.paths.manifestPath);

    const checks = await runDoctor(setup.probes);

    const registration = byName(checks, "Registration");
    expect(registration?.status).toBe("fail");
    expect(registration?.detail).toContain("no manifest at ~");
    expect(byName(checks, "Allowed extensions")?.status).toBe("fail");
  });

  it("fails when the manifest doesn't trust the store build yet", async () => {
    const { probes } = installed();

    const check = byName(
      await runDoctor({ ...probes, expectedOrigins: [DEV_ORIGIN, originOf(STORE_ID)] }),
      "Allowed extensions",
    );

    expect(check).toMatchObject({ status: "fail" });
    expect(check?.detail).toContain(`expected ${DEV_EXTENSION_ID} (development), ${STORE_ID}`);
  });

  it("fails on a damaged manifest", async () => {
    const setup = installed();
    setup.files.set(setup.paths.manifestPath, "{ not json");

    expect(byName(await runDoctor(setup.probes), "Allowed extensions")).toMatchObject({
      status: "fail",
      detail: "the host manifest is missing or damaged",
    });
  });

  it("reports a Node removed by a version manager", async () => {
    const setup = installed("darwin");
    setup.files.delete(setup.paths.nodePath);

    const launcher = byName(await runDoctor(setup.probes), "Launcher");

    expect(launcher).toMatchObject({ status: "fail" });
    expect(launcher?.detail).toContain("the Node it starts no longer exists: ~");
    expect(launcher?.fix).toContain("version manager (nvm, fnm…)");
  });

  it("reports a missing runtime and a launcher that isn't ours", async () => {
    const setup = installed();
    setup.files.delete(setup.paths.entryPath);
    expect(byName(await runDoctor(setup.probes), "Launcher")?.detail).toContain(
      "the runtime it starts is missing",
    );

    setup.files.set(setup.paths.launcherPath, "@echo off\r\nnode something.js\r\n");
    expect(byName(await runDoctor(setup.probes), "Launcher")?.detail).toContain(
      "missing or not a cv-snap launcher",
    );
  });

  it("warns about an older installed runtime and fails without one", async () => {
    const setup = installed();

    const newer = await runDoctor({ ...setup.probes, hostVersion: "0.2.0" });
    expect(byName(newer, "Installed version")).toMatchObject({
      status: "warn",
      detail: "0.1.0 installed, this is 0.2.0",
      fix: "Run `npx cv-snap-host install` to upgrade.",
    });
    expect(doctorExitCode(newer)).toBe(0);

    setup.files.delete(setup.join(setup.paths.entryPath, "..", "package.json"));
    expect(byName(await runDoctor(setup.probes), "Installed version")?.status).toBe("fail");
  });

  it("reports Claude Code not logged in and still shows the registration checks", async () => {
    const setup = installed();
    setup.setHealth({ isAuthenticated: false });

    const checks = await runDoctor(setup.probes);

    expect(byName(checks, "Claude Code login")).toMatchObject({
      status: "fail",
      fix: "Open a terminal, run `claude` and log in.",
    });
    expect(byName(checks, "Registration")?.status).toBe("pass");
    expect(byName(checks, "Launcher")?.status).toBe("pass");
    expect(doctorExitCode(checks)).toBe(1);
  });

  it("reports Claude Code missing, and only warns about an old version", async () => {
    const setup = installed();
    setup.setHealth({ claudeFound: false, isAuthenticated: false, isVersionSupported: false });
    const missing = await runDoctor(setup.probes);
    expect(missing.filter((check) => check.name.startsWith("Claude"))).toEqual([
      {
        name: "Claude Code",
        status: "fail",
        detail: "not found",
        fix: "Install Claude Code (claude.com/claude-code), then run doctor again.",
      },
    ]);

    setup.setHealth({ claudeVersion: "2.0.1", isVersionSupported: false });
    const old = await runDoctor(setup.probes);
    expect(byName(old, "Claude Code")).toMatchObject({
      status: "warn",
      fix: "Run `claude update`.",
    });
    expect(doctorExitCode(old)).toBe(0);
  });

  it("never shows the home directory", async () => {
    const setup = installed();
    setup.files.delete(setup.paths.nodePath);
    setup.setRegistered(setup.join(setup.home, "elsewhere.json"));

    const text = formatDoctor(await runDoctor(setup.probes)).join("\n");

    expect(text).not.toContain(setup.home);
    expect(text).not.toContain("jan");
  });
});

describe("formatDoctor", () => {
  it("prints one line per check, the fix under each problem and a summary", () => {
    const lines = formatDoctor([
      { name: "Node", status: "pass", detail: "26.12.1" },
      { name: "Claude Code", status: "warn", detail: "2.0.1", fix: "Run `claude update`." },
      { name: "Launcher", status: "fail", detail: "missing", fix: "Run install." },
    ]);

    expect(lines).toEqual([
      "✓ Node         26.12.1",
      "! Claude Code  2.0.1",
      "               → Run `claude update`.",
      "✗ Launcher     missing",
      "               → Run install.",
      "",
      "1 problem(s) to fix.",
    ]);
  });

  it("says ready, with the warning count", () => {
    expect(formatDoctor([{ name: "Node", status: "pass", detail: "26" }]).at(-1)).toBe(
      "cv-snap is ready.",
    );
    expect(formatDoctor([{ name: "Node", status: "warn", detail: "26", fix: "x" }]).at(-1)).toBe(
      "cv-snap is ready (1 warning(s)).",
    );
  });
});
