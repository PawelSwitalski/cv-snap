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
  const [{ runCommand }, { resolvePdfjsRoot }, { fileURLToPath }] = await Promise.all([
    import("./cli/commands.js"),
    import("./install/runtime.js"),
    import("node:url"),
  ]);
  const bundlePath = fileURLToPath(import.meta.url);
  try {
    process.exitCode = await runCommand(route, {
      platform: process.platform,
      env: process.env,
      bundlePath,
      resolvePdfjsRoot: () => resolvePdfjsRoot(bundlePath),
      nodePath: process.execPath,
      print: (line) => process.stdout.write(`${line}\n`),
      printError: (line) => process.stderr.write(`${line}\n`),
    });
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
