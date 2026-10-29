#!/usr/bin/env node
import { routeArgs } from "./cli/route.js";

/**
 * `cv-snap-host`: Chrome starts it with the extension's origin and gets the native-messaging host;
 * a person runs it with a command (story 002-cli-command-routing). Both paths load lazily, so the
 * CLI never touches the host's stdout handling and the host never prints CLI text.
 */
const route = routeArgs(process.argv.slice(2));

if (route.kind === "host") {
  const { runNativeHost } = await import("./host-main.js");
  await runNativeHost();
} else {
  const [{ runCommand }, { currentPlatform, toHostPlatform }, { dirname }, { fileURLToPath }] =
    await Promise.all([
      import("./cli/commands.js"),
      import("./install/platform.js"),
      import("node:path"),
      import("node:url"),
    ]);
  try {
    process.exitCode = await runCommand(route, {
      context: toHostPlatform(process.platform) === null ? null : currentPlatform(),
      // This file is dist/cv-snap-host.mjs; its directory is the runtime to install.
      sourceDir: dirname(fileURLToPath(import.meta.url)),
      nodePath: process.execPath,
      nodeVersion: process.versions.node,
      print: (line) => process.stdout.write(`${line}\n`),
      printError: (line) => process.stderr.write(`${line}\n`),
    });
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
