#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_EXTENSION_ID, isStoreIdSet, STORE_EXTENSION_ID } from "@cv-snap/shared";
import { hostInstallDir } from "../lib/paths.js";
import { installHost, uninstallHost } from "./install.js";

/** `node dist/install/cli.js install|uninstall` (root scripts `install-host` / `uninstall-host`). */

const print = (text: string) => process.stdout.write(`${text}\n`);

async function main(command: string | undefined): Promise<number> {
  if (process.platform !== "win32") {
    print("cv-snap host registration is only automated on Windows for now.");
    return 1;
  }
  const hostDir = hostInstallDir();
  if (command === "install") {
    const mainScriptPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "main.js");
    const result = await installHost({ hostDir, mainScriptPath, nodePath: process.execPath });
    print("cv-snap native host installed");
    print(`  manifest:  ${result.manifestPath}`);
    print(`  launcher:  ${result.wrapperPath}`);
    print(`  registry:  ${result.registryKey}`);
    print(`  trusts:    ${DEV_EXTENSION_ID} (development build)`);
    if (isStoreIdSet()) print(`             ${STORE_EXTENSION_ID} (Chrome Web Store)`);
    else
      print(
        "  note:      the Chrome Web Store ID isn't set yet; only the development build can connect",
      );
    print("Reload the extension in chrome://extensions to connect.");
    return 0;
  }
  if (command === "uninstall") {
    const result = await uninstallHost({ hostDir });
    print("cv-snap native host removed");
    print(`  registry:  ${result.registryKey} (deleted if present)`);
    print(`  directory: ${hostDir} (deleted)`);
    return 0;
  }
  print("Usage: cli.js install | uninstall");
  return 2;
}

try {
  process.exitCode = await main(process.argv[2]);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
