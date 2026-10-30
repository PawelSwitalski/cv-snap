import { describe, expect, it } from "vitest";
import { routeArgs, USAGE } from "./route.js";

const ORIGIN = "chrome-extension://mmchmbhcfcoeopinlclfbgaekeocdmnf/";

describe("routeArgs", () => {
  it("serves Chrome when started with the extension origin (macOS, Linux)", () => {
    expect(routeArgs([ORIGIN])).toEqual({ kind: "host" });
  });

  it("serves Chrome on Windows, where the parent window handle comes along", () => {
    expect(routeArgs([ORIGIN, "--parent-window=0"])).toEqual({ kind: "host" });
    expect(routeArgs(["--parent-window=1234", ORIGIN])).toEqual({ kind: "host" });
  });

  it.each([
    [["install"], { kind: "install" }],
    [["doctor"], { kind: "doctor", skipClaude: false }],
    [["doctor", "--skip-claude"], { kind: "doctor", skipClaude: true }],
    [["uninstall"], { kind: "uninstall", purge: false }],
    [["uninstall", "--purge"], { kind: "uninstall", purge: true }],
    [["--version"], { kind: "version" }],
    [["-v"], { kind: "version" }],
    [["--help"], { kind: "help" }],
    [["-h"], { kind: "help" }],
    [["help"], { kind: "help" }],
  ])("routes %j to a user command", (args, route) => {
    expect(routeArgs(args)).toEqual(route);
  });

  it("prints usage when run by hand without arguments", () => {
    expect(routeArgs([])).toEqual({ kind: "usage", problem: null });
  });

  it.each([
    [["instal"], "instal"],
    [["install", "--purge"], "--purge"],
    [["uninstall", "--force"], "--force"],
    [["doctor", "--fix"], "--fix"],
  ])("names the unknown argument in %j", (args, unknown) => {
    expect(routeArgs(args)).toEqual({ kind: "usage", problem: `Unknown argument: ${unknown}` });
  });

  it("lists every command", () => {
    for (const command of ["install", "uninstall [--purge]", "doctor", "--version", "--help"]) {
      expect(USAGE).toContain(command);
    }
  });
});
