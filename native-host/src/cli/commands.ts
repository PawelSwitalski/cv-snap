import { rmSync } from "node:fs";
import { DEV_EXTENSION_ID, isStoreIdSet, STORE_EXTENSION_ID } from "@cv-snap/shared";
import { installHost, uninstallHost } from "../install/install.js";
import { HostInUseError, isFileLockError, stageRuntime } from "../install/runtime.js";
import type { ProcessRunner } from "../lib/run-process.js";
import { appDataDir, hostInstallDir } from "../lib/paths.js";
import { HOST_VERSION } from "../version.js";
import { USAGE, type CliRoute } from "./route.js";

/** The user commands of `cv-snap-host` (everything except serving Chrome). */

export interface CommandDeps {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  /** The bundle being run; `install` copies it into the stable runtime directory. */
  bundlePath: string;
  resolvePdfjsRoot: () => string;
  nodePath: string;
  print: (line: string) => void;
  printError: (line: string) => void;
  run?: ProcessRunner;
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
      break;
  }

  if (deps.platform !== "win32") {
    deps.printError("cv-snap host registration is only automated on Windows for now.");
    return 1;
  }
  try {
    return route.kind === "install" ? await install(deps) : await uninstall(route.purge, deps);
  } catch (error) {
    if (error instanceof HostInUseError || isFileLockError(error)) {
      deps.printError(`The cv-snap host is running. ${HOST_IN_USE_HINT}`);
      return 1;
    }
    throw error;
  }
}

async function install(deps: CommandDeps): Promise<number> {
  const hostDir = hostInstallDir(deps.env);
  const { entryPath } = stageRuntime({
    hostDir,
    bundlePath: deps.bundlePath,
    pdfjsRoot: deps.resolvePdfjsRoot(),
    version: HOST_VERSION,
  });
  const result = await installHost({
    hostDir,
    mainScriptPath: entryPath,
    nodePath: deps.nodePath,
    ...(deps.run ? { run: deps.run } : {}),
  });
  deps.print(`cv-snap native host ${HOST_VERSION} installed`);
  deps.print(`  runtime:   ${entryPath}`);
  deps.print(`  manifest:  ${result.manifestPath}`);
  deps.print(`  launcher:  ${result.wrapperPath}`);
  deps.print(`  registry:  ${result.registryKey}`);
  deps.print(`  trusts:    ${DEV_EXTENSION_ID} (development build)`);
  if (isStoreIdSet()) deps.print(`             ${STORE_EXTENSION_ID} (Chrome Web Store)`);
  else
    deps.print(
      "  note:      the Chrome Web Store ID isn't set yet; only the development build can connect",
    );
  deps.print("Reload the extension in chrome://extensions to connect.");
  return 0;
}

async function uninstall(purge: boolean, deps: CommandDeps): Promise<number> {
  const hostDir = hostInstallDir(deps.env);
  const result = await uninstallHost({ hostDir, ...(deps.run ? { run: deps.run } : {}) });
  deps.print("cv-snap native host removed");
  deps.print(`  registry:  ${result.registryKey} (deleted if present)`);
  deps.print(`  directory: ${hostDir} (deleted)`);
  if (purge) {
    const dataDir = appDataDir(deps.env);
    rmSync(dataDir, { recursive: true, force: true });
    deps.print(`  data:      ${dataDir} (deleted, including logs)`);
  } else {
    deps.print("  logs:      kept (run `cv-snap-host uninstall --purge` to delete them too)");
  }
  return 0;
}
