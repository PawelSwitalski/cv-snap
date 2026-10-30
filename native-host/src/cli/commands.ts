import { existsSync, readFileSync, rmSync } from "node:fs";
import {
  allowedExtensionOrigins,
  DEV_EXTENSION_ID,
  isStoreIdSet,
  STORE_EXTENSION_ID,
  type HealthReport,
} from "@cv-snap/shared";
import { checkHealth } from "../health/check-health.js";
import { installHost, queryRegisteredManifest, uninstallHost } from "../install/install.js";
import {
  chromeManifestDir,
  dataDir,
  displayPath,
  hostDir,
  type PlatformContext,
} from "../install/platform.js";
import { HostInUseError, isFileLockError, stageRuntime } from "../install/runtime.js";
import type { ProcessRunner } from "../lib/run-process.js";
import { HOST_VERSION } from "../version.js";
import { doctorExitCode, formatDoctor, runDoctor } from "./doctor.js";
import { USAGE, type CliRoute } from "./route.js";

/** The user commands of `cv-snap-host` (everything except serving Chrome). */

export interface CommandDeps {
  /** null on an OS cv-snap doesn't support (only Windows, macOS and Linux are). */
  context: PlatformContext | null;
  /** The package's `dist/` (bundle + vendored pdf.js); `install` copies it as the runtime. */
  sourceDir: string;
  nodePath: string;
  nodeVersion: string;
  print: (line: string) => void;
  printError: (line: string) => void;
  run?: ProcessRunner;
  health?: () => Promise<HealthReport>;
}

const HOST_IN_USE_HINT =
  "Close the cv-snap side panel (or Chrome), then run the command again. The installed host was left unchanged.";

export async function runCommand(
  route: Exclude<CliRoute, { kind: "host" }>,
  deps: CommandDeps,
): Promise<number> {
  switch (route.kind) {
    case "version":
      deps.print(HOST_VERSION);
      return 0;
    case "help":
      deps.print(USAGE);
      return 0;
    case "usage":
      if (route.problem !== null) deps.printError(route.problem);
      deps.printError(USAGE);
      return 2;
    case "install":
    case "uninstall":
    case "doctor":
      break;
  }

  const { context } = deps;
  if (context === null) {
    deps.printError("cv-snap supports Windows, macOS and Linux only.");
    return 1;
  }
  try {
    switch (route.kind) {
      case "install":
        return await install(context, deps);
      case "uninstall":
        return await uninstall(context, route.purge, deps);
      case "doctor":
        return await doctor(context, route.skipClaude, deps);
    }
  } catch (error) {
    if (error instanceof HostInUseError || isFileLockError(error)) {
      deps.printError(`The cv-snap host is running. ${HOST_IN_USE_HINT}`);
      return 1;
    }
    throw error;
  }
}

async function install(context: PlatformContext, deps: CommandDeps): Promise<number> {
  const show = (path: string) => displayPath(context, path);
  const installDir = hostDir(context);
  const { entryPath } = stageRuntime({
    hostDir: installDir,
    sourceDir: deps.sourceDir,
    version: HOST_VERSION,
  });
  const result = await installHost({
    platform: context.platform,
    hostDir: installDir,
    manifestDir: chromeManifestDir(context),
    mainScriptPath: entryPath,
    nodePath: deps.nodePath,
    ...(deps.run ? { run: deps.run } : {}),
  });
  deps.print(`cv-snap native host ${HOST_VERSION} installed`);
  deps.print(`  runtime:   ${show(entryPath)}`);
  deps.print(`  launcher:  ${show(result.launcherPath)} (Node: ${show(deps.nodePath)})`);
  deps.print(`  manifest:  ${show(result.manifestPath)}`);
  if (result.registryKey !== null) deps.print(`  registry:  ${result.registryKey}`);
  deps.print(`  trusts:    ${DEV_EXTENSION_ID} (development build)`);
  if (isStoreIdSet()) deps.print(`             ${STORE_EXTENSION_ID} (Chrome Web Store)`);
  else
    deps.print(
      "  note:      the Chrome Web Store ID isn't set yet; only the development build can connect",
    );
  deps.print("Reload the extension in chrome://extensions to connect.");
  return 0;
}

async function uninstall(
  context: PlatformContext,
  purge: boolean,
  deps: CommandDeps,
): Promise<number> {
  const show = (path: string) => displayPath(context, path);
  const installDir = hostDir(context);
  const result = await uninstallHost({
    platform: context.platform,
    hostDir: installDir,
    manifestDir: chromeManifestDir(context),
    ...(deps.run ? { run: deps.run } : {}),
  });
  deps.print("cv-snap native host removed");
  deps.print(`  registration: ${show(result.registration)} (deleted if present)`);
  deps.print(`  directory:    ${show(installDir)} (deleted)`);
  if (purge) {
    const data = dataDir(context);
    rmSync(data, { recursive: true, force: true });
    deps.print(`  data:         ${show(data)} (deleted, including logs)`);
  } else {
    deps.print("  logs:         kept (run `cv-snap-host uninstall --purge` to delete them too)");
  }
  return 0;
}

async function doctor(
  context: PlatformContext,
  skipClaude: boolean,
  deps: CommandDeps,
): Promise<number> {
  const checks = await runDoctor(
    {
      context,
      nodeVersion: deps.nodeVersion,
      hostVersion: HOST_VERSION,
      expectedOrigins: allowedExtensionOrigins(),
      readFile: (path) => {
        try {
          return readFileSync(path, "utf8");
        } catch {
          return null;
        }
      },
      exists: existsSync,
      queryRegistry: () => queryRegisteredManifest(undefined, deps.run),
      health: deps.health ?? (() => checkHealth(deps.run ? { run: deps.run } : {})),
    },
    { skipClaude },
  );
  deps.print(`cv-snap-host ${HOST_VERSION} doctor`);
  for (const line of formatDoctor(checks)) deps.print(line);
  if (skipClaude) deps.print("(Claude Code checks skipped: --skip-claude)");
  return doctorExitCode(checks);
}
