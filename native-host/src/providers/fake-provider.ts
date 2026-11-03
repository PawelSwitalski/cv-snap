import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CvSnapError,
  JobRequirementsSchema,
  ParsedCvProfileContentSchema,
  TailoringPlanSchema,
  type CvGenerationProvider,
  type CvProfileContent,
  type HealthReport,
  type JobRequirements,
  type ProviderCallOptions,
  type TailoringPlan,
} from "@cv-snap/shared";
import type { z } from "zod";
import { HOST_VERSION } from "../version.js";

/**
 * Environment variable that switches the host to `FakeProvider` (story 001-fake-ai-provider). Set
 * only by the Playwright harness's launcher; nothing in the native-messaging protocol can set it.
 */
export const FAKE_PROVIDER_ENV = "CV_SNAP_FAKE_PROVIDER";

/** Fixture files in the directory named by `FAKE_PROVIDER_ENV`. */
export const FAKE_PROVIDER_FILES = {
  profile: "profile.json",
  requirements: "requirements.json",
  plan: "plan.json",
} as const;

/**
 * Test adapter of the `CvGenerationProvider` port: answers every AI step with canned JSON from a
 * fixtures directory, validated with the same schemas as Claude's output, so end-to-end tests run
 * without Claude Code or a network. Reports a healthy Claude so the extension's setup check passes.
 */
export class FakeProvider implements CvGenerationProvider {
  constructor(private readonly fixturesDir: string) {}

  checkHealth(): Promise<HealthReport> {
    return Promise.resolve({
      hostVersion: HOST_VERSION,
      claudeFound: true,
      claudeVersion: "fake",
      isAuthenticated: true,
      isVersionSupported: true,
    });
  }

  createProfile(_input: unknown, options: ProviderCallOptions): Promise<CvProfileContent> {
    options.onProgress?.("creating-profile");
    return this.read("profile", ParsedCvProfileContentSchema, options);
  }

  parseRequirements(_input: unknown, options: ProviderCallOptions): Promise<JobRequirements> {
    options.onProgress?.("parsing-requirements");
    return this.read("requirements", JobRequirementsSchema, options);
  }

  tailor(_input: unknown, options: ProviderCallOptions): Promise<TailoringPlan> {
    options.onProgress?.("tailoring");
    return this.read("plan", TailoringPlanSchema, options);
  }

  private async read<T extends z.ZodType>(
    kind: keyof typeof FAKE_PROVIDER_FILES,
    schema: T,
    options: ProviderCallOptions,
  ): Promise<z.infer<T>> {
    if (options.signal.aborted) throw new CvSnapError("CANCELLED", "Generation was cancelled.");
    const text = await readFile(join(this.fixturesDir, FAKE_PROVIDER_FILES[kind]), "utf8");
    const parsed = schema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new CvSnapError("GENERATION_FAILED", `Fake provider fixture "${kind}" is invalid.`);
    }
    return parsed.data;
  }
}

/** The fake provider when the environment asks for it, otherwise null (use Claude Code). */
export function fakeProviderFromEnv(env: NodeJS.ProcessEnv): FakeProvider | null {
  const dir = env[FAKE_PROVIDER_ENV];
  return dir ? new FakeProvider(dir) : null;
}
