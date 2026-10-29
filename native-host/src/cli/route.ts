/**
 * Decides what one run of `cv-snap-host` does (story 002-cli-command-routing). Chrome starts the
 * program with the caller's origin (`chrome-extension://<id>/`, plus `--parent-window=<n>` on
 * Windows); anything else is a person at a terminal.
 */
export type CliRoute =
  | { kind: "host" }
  | { kind: "install" }
  | { kind: "uninstall"; purge: boolean }
  | { kind: "doctor" }
  | { kind: "version" }
  | { kind: "help" }
  | { kind: "usage"; problem: string | null };

const CHROME_ORIGIN_PREFIX = "chrome-extension://";

export function routeArgs(args: readonly string[]): CliRoute {
  if (args.some((arg) => arg.startsWith(CHROME_ORIGIN_PREFIX))) return { kind: "host" };

  const [command, ...rest] = args;
  if (command === undefined) return { kind: "usage", problem: null };
  const extra = (allowed: readonly string[]) => rest.find((arg) => !allowed.includes(arg));

  switch (command) {
    case "install": {
      const unknown = extra([]);
      return unknown === undefined ? { kind: "install" } : unknownArgument(unknown);
    }
    case "uninstall": {
      const unknown = extra(["--purge"]);
      return unknown === undefined
        ? { kind: "uninstall", purge: rest.includes("--purge") }
        : unknownArgument(unknown);
    }
    case "doctor": {
      const unknown = extra([]);
      return unknown === undefined ? { kind: "doctor" } : unknownArgument(unknown);
    }
    case "--version":
    case "-v":
      return { kind: "version" };
    case "--help":
    case "-h":
    case "help":
      return { kind: "help" };
    default:
      return unknownArgument(command);
  }
}

const unknownArgument = (arg: string): CliRoute => ({
  kind: "usage",
  problem: `Unknown argument: ${arg}`,
});

export const USAGE = [
  "Usage: cv-snap-host <command>",
  "",
  "Commands:",
  "  install              Connect the cv-snap Chrome extension to your Claude Code (this user only)",
  "  uninstall [--purge]  Remove the connection again; --purge also deletes cv-snap's logs",
  "  doctor               Check the setup and show how to fix each problem",
  "  --version            Print the version",
  "  --help               Show this help",
  "",
  "Chrome starts cv-snap-host by itself; you only run it to install or remove it.",
].join("\n");
