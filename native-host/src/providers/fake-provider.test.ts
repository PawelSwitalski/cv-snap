import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MODEL, type ProgressStep } from "@cv-snap/shared";
import { afterEach, describe, expect, it } from "vitest";
import { FAKE_PROVIDER_ENV, FakeProvider, fakeProviderFromEnv } from "./fake-provider.js";

const FIXTURES = fileURLToPath(new URL("../../../e2e/fixtures/provider", import.meta.url));

const options = (steps: ProgressStep[] = [], signal = new AbortController().signal) => ({
  model: DEFAULT_MODEL,
  signal,
  onProgress: (step: ProgressStep) => steps.push(step),
});

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("FakeProvider", () => {
  it("answers every step from the fixtures with the normal progress steps", async () => {
    const provider = new FakeProvider(FIXTURES);
    const steps: ProgressStep[] = [];

    const profile = await provider.createProfile({ cvText: "x" }, options(steps));
    const requirements = await provider.parseRequirements(
      { adText: "x", url: null },
      options(steps),
    );
    const plan = await provider.tailor({}, options(steps));

    expect(profile.experience.length).toBeGreaterThan(0);
    expect(requirements.title).toBe("Senior Frontend Developer");
    expect(plan.items.length).toBeGreaterThan(0);
    expect(steps).toEqual(["creating-profile", "parsing-requirements", "tailoring"]);
  });

  it("reports a healthy Claude so the setup check passes", async () => {
    await expect(new FakeProvider(FIXTURES).checkHealth()).resolves.toMatchObject({
      claudeFound: true,
      isAuthenticated: true,
      isVersionSupported: true,
    });
  });

  it("fails with GENERATION_FAILED when a fixture doesn't match its schema", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cvsnap-fake-"));
    dirs.push(dir);
    writeFileSync(join(dir, "plan.json"), JSON.stringify({ items: "nope" }));

    await expect(new FakeProvider(dir).tailor({}, options())).rejects.toMatchObject({
      code: "GENERATION_FAILED",
    });
  });

  it("fails with CANCELLED when the request was already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      new FakeProvider(FIXTURES).tailor({}, options([], controller.signal)),
    ).rejects.toMatchObject({ code: "CANCELLED" });
  });
});

describe("fakeProviderFromEnv", () => {
  it("is null unless the environment variable names a directory", () => {
    expect(fakeProviderFromEnv({})).toBeNull();
    expect(fakeProviderFromEnv({ [FAKE_PROVIDER_ENV]: "" })).toBeNull();
    expect(fakeProviderFromEnv({ [FAKE_PROVIDER_ENV]: FIXTURES })).toBeInstanceOf(FakeProvider);
  });
});
