import { DEV_EXTENSION_ID, STORE_EXTENSION_ID, type HealthReport } from "@cv-snap/shared";
import { manifestPathFor, parseLauncher } from "../install/install.js";
import {
  chromeManifestDir,
  displayPath,
  hostDir,
  launcherFileName,
  pathFor,
  type PlatformContext,
} from "../install/platform.js";

/**
 * `cv-snap-host doctor` (story 005): checks every link from Chrome to Claude Code and gives one
 * fix per problem. Pure over `DoctorProbes`, so each failure is testable without a broken install.
 * Paths are shown relative to `~` and Claude's account details are never read, so the output
 * contains no personal data.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface DoctorCheck {
  name: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
}

export interface DoctorProbes {
  context: PlatformContext;
  nodeVersion: string;
  hostVersion: string;
  expectedOrigins: readonly string[];
  readFile: (path: string) => string | null;
  exists: (path: string) => boolean;
  /** Windows only: the manifest path registered under HKCU, or null. */
  queryRegistry: () => Promise<string | null>;
  health: () => Promise<HealthReport>;
}

export const MIN_NODE_MAJOR = 24;
const INSTALL_FIX = "Run `npx cv-snap-host install`, then reload the extension.";

/** `skipClaude`: leave out the Claude Code checks (CI runners have no Claude Code). */
export async function runDoctor(
  probes: DoctorProbes,
  options: { skipClaude?: boolean } = {},
): Promise<DoctorCheck[]> {
  const { context } = probes;
  const { join } = pathFor(context.platform);
  const show = (path: string) => displayPath(context, path);
  const checks: DoctorCheck[] = [checkNode(probes.nodeVersion)];

  // Registration: Chrome finds the manifest through the registry (Windows) or its directory.
  const installDir = hostDir(context);
  const manifestPath = manifestPathFor({
    platform: context.platform,
    hostDir: installDir,
    manifestDir: chromeManifestDir(context),
  });
  if (context.platform === "win32") {
    const registered = await probes.queryRegistry();
    checks.push(
      registered === null
        ? { name: "Registration", status: "fail", detail: "not registered", fix: INSTALL_FIX }
        : samePath(context, registered, manifestPath)
          ? { name: "Registration", status: "pass", detail: show(registered) }
          : {
              name: "Registration",
              status: "fail",
              detail: `points to ${show(registered)}, expected ${show(manifestPath)}`,
              fix: INSTALL_FIX,
            },
    );
  } else {
    checks.push(
      probes.exists(manifestPath)
        ? { name: "Registration", status: "pass", detail: show(manifestPath) }
        : {
            name: "Registration",
            status: "fail",
            detail: `no manifest at ${show(manifestPath)}`,
            fix: INSTALL_FIX,
          },
    );
  }

  // Manifest: readable, and trusting exactly the cv-snap builds.
  const manifest = readManifest(probes.readFile(manifestPath));
  let launcherPath = join(installDir, launcherFileName(context.platform));
  if (manifest === null) {
    checks.push({
      name: "Allowed extensions",
      status: "fail",
      detail: "the host manifest is missing or damaged",
      fix: INSTALL_FIX,
    });
  } else {
    launcherPath = manifest.path;
    const trusted = manifest.origins.map(idOf);
    const expected = probes.expectedOrigins.map(idOf);
    const matches =
      trusted.length === expected.length && expected.every((id) => trusted.includes(id));
    checks.push(
      matches
        ? { name: "Allowed extensions", status: "pass", detail: trusted.map(label).join(", ") }
        : {
            name: "Allowed extensions",
            status: "fail",
            detail: `trusts ${trusted.map(label).join(", ") || "nothing"}; expected ${expected.map(label).join(", ")}`,
            fix: INSTALL_FIX,
          },
    );
  }

  // Launcher: the Node and the runtime it starts must both still exist.
  const launcher = parseLauncher(probes.readFile(launcherPath) ?? "");
  if (launcher === null) {
    checks.push({
      name: "Launcher",
      status: "fail",
      detail: `missing or not a cv-snap launcher: ${show(launcherPath)}`,
      fix: INSTALL_FIX,
    });
  } else if (!probes.exists(launcher.nodePath)) {
    checks.push({
      name: "Launcher",
      status: "fail",
      detail: `the Node it starts no longer exists: ${show(launcher.nodePath)}`,
      fix: `A version manager (nvm, fnm…) may have removed it. ${INSTALL_FIX}`,
    });
  } else if (!probes.exists(launcher.mainScriptPath)) {
    checks.push({
      name: "Launcher",
      status: "fail",
      detail: `the runtime it starts is missing: ${show(launcher.mainScriptPath)}`,
      fix: INSTALL_FIX,
    });
  } else {
    checks.push({ name: "Launcher", status: "pass", detail: show(launcher.mainScriptPath) });
  }

  // Installed version: an older runtime keeps working, but should be upgraded.
  const installed = readVersion(probes.readFile(join(installDir, "runtime", "package.json")));
  checks.push(
    installed === null
      ? {
          name: "Installed version",
          status: "fail",
          detail: "no installed runtime",
          fix: INSTALL_FIX,
        }
      : installed === probes.hostVersion
        ? { name: "Installed version", status: "pass", detail: installed }
        : {
            name: "Installed version",
            status: "warn",
            detail: `${installed} installed, this is ${probes.hostVersion}`,
            fix: "Run `npx cv-snap-host install` to upgrade.",
          },
  );

  if (!options.skipClaude) checks.push(...claudeChecks(await probes.health()));
  return checks;
}

function checkNode(version: string): DoctorCheck {
  const major = Number(/^v?(\d+)/.exec(version)?.[1] ?? 0);
  return major >= MIN_NODE_MAJOR
    ? { name: "Node", status: "pass", detail: version }
    : {
        name: "Node",
        status: "fail",
        detail: `${version} (needs ${String(MIN_NODE_MAJOR)} or newer)`,
        fix: `Install Node ${String(MIN_NODE_MAJOR)} or newer (nodejs.org), then run \`npx cv-snap-host install\`.`,
      };
}

/** Claude Code through the host's own health check (found, logged in, version). */
function claudeChecks(report: HealthReport): DoctorCheck[] {
  if (!report.claudeFound) {
    return [
      {
        name: "Claude Code",
        status: "fail",
        detail: "not found",
        fix: "Install Claude Code (claude.com/claude-code), then run doctor again.",
      },
    ];
  }
  const version = report.claudeVersion ?? "unknown version";
  return [
    report.isVersionSupported
      ? { name: "Claude Code", status: "pass", detail: version }
      : {
          name: "Claude Code",
          status: "warn",
          detail: `${version} is older than the tested version`,
          fix: "Run `claude update`.",
        },
    report.isAuthenticated
      ? { name: "Claude Code login", status: "pass", detail: "logged in" }
      : {
          name: "Claude Code login",
          status: "fail",
          detail: "not logged in",
          fix: "Open a terminal, run `claude` and log in.",
        },
  ];
}

const SYMBOL: Record<CheckStatus, string> = { pass: "✓", warn: "!", fail: "✗" };

export function formatDoctor(checks: readonly DoctorCheck[]): string[] {
  const width = Math.max(...checks.map((check) => check.name.length));
  const lines = checks.flatMap((check) => [
    `${SYMBOL[check.status]} ${check.name.padEnd(width)}  ${check.detail}`,
    ...(check.fix ? [`  ${" ".repeat(width)}  → ${check.fix}`] : []),
  ]);
  const failures = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter((check) => check.status === "warn").length;
  lines.push(
    "",
    failures > 0
      ? `${String(failures)} problem(s) to fix.`
      : warnings > 0
        ? `cv-snap is ready (${String(warnings)} warning(s)).`
        : "cv-snap is ready.",
  );
  return lines;
}

export const doctorExitCode = (checks: readonly DoctorCheck[]): number =>
  checks.some((check) => check.status === "fail") ? 1 : 0;

function readManifest(text: string | null): { path: string; origins: string[] } | null {
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return null;
    const { path, allowed_origins: origins } = value as Record<string, unknown>;
    if (typeof path !== "string" || !Array.isArray(origins)) return null;
    return {
      path,
      origins: origins.filter((origin): origin is string => typeof origin === "string"),
    };
  } catch {
    return null;
  }
}

function readVersion(text: string | null): string | null {
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && "version" in value
      ? typeof value.version === "string"
        ? value.version
        : null
      : null;
  } catch {
    return null;
  }
}

const idOf = (origin: string) => /^chrome-extension:\/\/([^/]+)\/?$/.exec(origin)?.[1] ?? origin;
const label = (id: string) =>
  id === DEV_EXTENSION_ID
    ? `${id} (development)`
    : id === STORE_EXTENSION_ID
      ? `${id} (Chrome Web Store)`
      : id;

function samePath(context: PlatformContext, a: string, b: string): boolean {
  return context.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}
