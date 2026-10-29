import { describe, expect, it } from "vitest";
import {
  chromeManifestDir,
  dataDir,
  displayPath,
  hostDir,
  launcherFileName,
  toHostPlatform,
  type PlatformContext,
} from "./platform.js";

const windows: PlatformContext = {
  platform: "win32",
  env: { LOCALAPPDATA: "C:\\Users\\jan\\AppData\\Local" },
  home: "C:\\Users\\jan",
};
const mac: PlatformContext = { platform: "darwin", env: {}, home: "/Users/jan" };
const linux: PlatformContext = { platform: "linux", env: {}, home: "/home/jan" };

describe("per-OS layout", () => {
  it("uses %LOCALAPPDATA% and the registry on Windows", () => {
    expect(dataDir(windows)).toBe("C:\\Users\\jan\\AppData\\Local\\cv-snap");
    expect(hostDir(windows)).toBe("C:\\Users\\jan\\AppData\\Local\\cv-snap\\host");
    expect(chromeManifestDir(windows)).toBeNull();
    expect(launcherFileName("win32")).toBe("cv-snap-host.cmd");
  });

  it("falls back to AppData\\Local under the home directory without %LOCALAPPDATA%", () => {
    expect(dataDir({ ...windows, env: {} })).toBe("C:\\Users\\jan\\AppData\\Local\\cv-snap");
  });

  it("uses Application Support and Chrome's NativeMessagingHosts on macOS", () => {
    expect(dataDir(mac)).toBe("/Users/jan/Library/Application Support/cv-snap");
    expect(chromeManifestDir(mac)).toBe(
      "/Users/jan/Library/Application Support/Google/Chrome/NativeMessagingHosts",
    );
    expect(launcherFileName("darwin")).toBe("cv-snap-host");
  });

  it("uses the XDG data dir and ~/.config/google-chrome on Linux", () => {
    expect(dataDir(linux)).toBe("/home/jan/.local/share/cv-snap");
    expect(dataDir({ ...linux, env: { XDG_DATA_HOME: "/data/jan" } })).toBe("/data/jan/cv-snap");
    expect(dataDir({ ...linux, env: { XDG_DATA_HOME: "" } })).toBe(
      "/home/jan/.local/share/cv-snap",
    );
    expect(chromeManifestDir(linux)).toBe("/home/jan/.config/google-chrome/NativeMessagingHosts");
    expect(hostDir(linux)).toBe("/home/jan/.local/share/cv-snap/host");
  });

  it("supports exactly Windows, macOS and Linux", () => {
    expect(["win32", "darwin", "linux"].map((p) => toHostPlatform(p as NodeJS.Platform))).toEqual([
      "win32",
      "darwin",
      "linux",
    ]);
    expect(toHostPlatform("freebsd")).toBeNull();
  });
});

describe("displayPath", () => {
  it("replaces the home directory with ~ so no user name is printed", () => {
    expect(displayPath(linux, "/home/jan/.config/x.json")).toBe("~/.config/x.json");
    expect(displayPath(linux, "/home/jan")).toBe("~");
    expect(displayPath(windows, "C:\\Users\\jan\\AppData\\Local\\cv-snap")).toBe(
      "~\\AppData\\Local\\cv-snap",
    );
  });

  it("ignores case on Windows only", () => {
    expect(displayPath(windows, "c:\\users\\JAN\\x")).toBe("~\\x");
    expect(displayPath(linux, "/home/JAN/x")).toBe("/home/JAN/x");
  });

  it("leaves other paths and look-alike prefixes alone", () => {
    expect(displayPath(linux, "/home/janek/x")).toBe("/home/janek/x");
    expect(displayPath(linux, "/usr/bin/node")).toBe("/usr/bin/node");
    expect(displayPath({ ...linux, home: "" }, "/x")).toBe("/x");
  });
});
