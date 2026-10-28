import {
  adKeyFor,
  CvSnapError,
  type CvProfileContent,
  type RequirementsCacheEntry,
} from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { smallPlan, smallProfile } from "../../../test/cv-fixtures";
import {
  callOptions,
  fakeProvider,
  invalidOutput,
  smallRequirements,
} from "../../../test/tailoring-fixtures";
import type { RequirementsCacheRepository } from "./ports";
import { ProfileExtraction } from "./profile-extraction";
import { RequirementsResolution, type AdInput } from "./requirements-resolution";
import { isInvalidOutput, retryOnceOnInvalidOutput } from "./retry";
import { createTailoringServices } from "./services";
import { InvalidPlanError, missingHeadings, Tailoring } from "./tailoring";

const NOW = new Date("2026-10-27T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const ad = (overrides: Partial<AdInput> = {}): AdInput => ({
  text: "Senior Frontend Developer. Wymagania: React.",
  url: "https://example.com/job/1?utm_source=newsletter",
  structuredFields: null,
  isManualSelection: false,
  ...overrides,
});

/** In-memory cache with the same freshness rule as the real one. */
function memoryCache(initial: Record<string, RequirementsCacheEntry> = {}) {
  const entries = new Map(Object.entries(initial));
  const cache: RequirementsCacheRepository = {
    get: (key, now) => {
      const entry = entries.get(key);
      const isFresh = entry && now.getTime() < Date.parse(entry.parsedAt) + 7 * DAY;
      return Promise.resolve(isFresh ? entry : null);
    },
    put: (key, entry) => {
      entries.set(key, entry);
      return Promise.resolve();
    },
  };
  return { cache, entries };
}

describe("retryOnceOnInvalidOutput", () => {
  it("retries exactly once on invalid output, then gives up", async () => {
    let attempts = 0;

    await expect(
      retryOnceOnInvalidOutput(() => {
        attempts++;
        return Promise.reject(invalidOutput());
      }, new AbortController().signal),
    ).rejects.toMatchObject({ code: "GENERATION_FAILED", reason: "INVALID_OUTPUT" });
    expect(attempts).toBe(2);
  });

  it.each([
    new CvSnapError("GENERATION_TIMEOUT", "slow"),
    new CvSnapError("MODEL_UNAVAILABLE", "no"),
    new CvSnapError("GENERATION_FAILED", "x", { reason: "CLAUDE_ERROR" }),
    new Error("boom"),
  ])("never retries other errors (%s)", async (error) => {
    let attempts = 0;

    await expect(
      retryOnceOnInvalidOutput(() => {
        attempts++;
        return Promise.reject(error);
      }, new AbortController().signal),
    ).rejects.toBe(error);
    expect(attempts).toBe(1);
  });

  it("doesn't retry after a cancel", async () => {
    const controller = new AbortController();
    let attempts = 0;

    await expect(
      retryOnceOnInvalidOutput(() => {
        attempts++;
        controller.abort();
        return Promise.reject(invalidOutput());
      }, controller.signal),
    ).rejects.toMatchObject({ reason: "INVALID_OUTPUT" });
    expect(attempts).toBe(1);
    expect(isInvalidOutput(new Error("x"))).toBe(false);
  });
});

describe("ProfileExtraction", () => {
  it("returns the draft and retries once on invalid output", async () => {
    const draft: CvProfileContent = smallProfile();
    const fake = fakeProvider({ profile: [invalidOutput(), draft] });

    const result = await new ProfileExtraction(fake.provider).createDraft("cv", callOptions());

    expect(result).toBe(draft);
    expect(fake.calls.createProfile).toBe(2);
  });

  it("fails with GENERATION_FAILED after the single retry", async () => {
    const fake = fakeProvider({ profile: [invalidOutput(), invalidOutput()] });

    await expect(
      new ProfileExtraction(fake.provider).createDraft("cv", callOptions()),
    ).rejects.toMatchObject({ code: "GENERATION_FAILED" });
    expect(fake.calls.createProfile).toBe(2);
  });
});

describe("RequirementsResolution", () => {
  it("parses on a miss, caches the result and serves the same ad from cache without a host call", async () => {
    const { cache, entries } = memoryCache();
    const fake = fakeProvider({ requirements: [smallRequirements()] });
    const resolution = new RequirementsResolution(fake.provider, cache, () => NOW);

    const first = await resolution.resolve(ad(), callOptions());
    const second = await resolution.resolve(
      ad({ url: "https://EXAMPLE.com/job/1?fbclid=other" }),
      callOptions(),
    );

    expect(first.fromCache).toBe(false);
    expect(second).toMatchObject({ fromCache: true, adKey: first.adKey });
    expect(fake.calls.parseRequirements).toBe(1);
    expect(JSON.stringify([...entries.values()])).not.toContain("Wymagania: React");
  });

  it("re-parses and replaces an entry older than 7 days", async () => {
    const stale = {
      requirements: smallRequirements(),
      parsedAt: new Date(NOW.getTime() - 8 * DAY).toISOString(),
    };
    const key = await adKeyFor(ad().url, { kind: "page", text: ad().text });
    const { cache, entries } = memoryCache({ [key]: stale });
    const fresh = { ...smallRequirements(), title: "Re-parsed" };
    const fake = fakeProvider({ requirements: [fresh] });

    const result = await new RequirementsResolution(fake.provider, cache, () => NOW).resolve(
      ad(),
      callOptions(),
    );

    expect(result).toMatchObject({ fromCache: false, requirements: { title: "Re-parsed" } });
    expect(entries.get(key)?.parsedAt).toBe(NOW.toISOString());
  });

  it("keeps two offers shown under one URL apart (justjoin.it-style boards)", async () => {
    const { cache } = memoryCache({});
    const fake = fakeProvider({
      requirements: [smallRequirements(), { ...smallRequirements(), title: "Second offer" }],
    });
    const resolution = new RequirementsResolution(fake.provider, cache, () => NOW);
    const first = ad({ url: "https://justjoin.it/", text: "Offer one. Requirements: Java." });
    const second = ad({ url: "https://justjoin.it/", text: "Offer two. Requirements: React." });

    await resolution.resolve(first, callOptions());
    const result = await resolution.resolve(second, callOptions());

    expect(result).toMatchObject({ fromCache: false, requirements: { title: "Second offer" } });
  });

  it("keys manual selections separately from the page", async () => {
    const { cache } = memoryCache();
    const fake = fakeProvider({ requirements: [smallRequirements(), smallRequirements()] });
    const resolution = new RequirementsResolution(fake.provider, cache, () => NOW);

    const page = await resolution.resolve(ad(), callOptions());
    const selection = await resolution.resolve(ad({ isManualSelection: true }), callOptions());

    expect(selection.adKey).not.toBe(page.adKey);
    expect(fake.calls.parseRequirements).toBe(2);
  });

  it("retries once on invalid output and treats cache failures as a miss", async () => {
    const broken: RequirementsCacheRepository = {
      get: () => Promise.reject(new Error("storage down")),
      put: () => Promise.reject(new Error("storage down")),
    };
    const fake = fakeProvider({ requirements: [invalidOutput(), smallRequirements()] });

    const result = await new RequirementsResolution(fake.provider, broken, () => NOW).resolve(
      ad(),
      callOptions(),
    );

    expect(result.fromCache).toBe(false);
    expect(fake.calls.parseRequirements).toBe(2);
  });
});

describe("Tailoring", () => {
  const request = (overrides: Partial<Parameters<Tailoring["tailor"]>[0]> = {}) => ({
    profile: smallProfile(),
    requirements: smallRequirements(),
    override: null,
    validatorFeedback: null,
    ...overrides,
  });

  it("asks for the ad's language and returns a plan whose citations all resolve", async () => {
    const fake = fakeProvider({ plan: [smallPlan()] });

    const result = await new Tailoring(fake.provider).tailor(request(), callOptions());

    expect(fake.tailorInputs[0]?.outputLanguage).toBe("pl");
    expect(result.outputLanguage).toEqual({ code: "pl", source: "ad" });
  });

  it("uses the override, and the profile's language when the ad's is undecidable", async () => {
    const english = { ...smallPlan(), language: "en" };
    const fake = fakeProvider({ plan: [english, smallPlan()] });
    const tailoring = new Tailoring(fake.provider);

    await tailoring.tailor(request({ override: "en" }), callOptions());
    const fallback = await tailoring.tailor(
      request({ requirements: { ...smallRequirements(), language: null } }),
      callOptions(),
    );

    expect(fake.tailorInputs.map((input) => input.outputLanguage)).toEqual(["en", "pl"]);
    expect(fallback.outputLanguage.source).toBe("profile");
  });

  it("rejects a plan in the wrong language as retryable invalid output", async () => {
    const fake = fakeProvider({ plan: [{ ...smallPlan(), language: "en" }] });

    const error = await new Tailoring(fake.provider)
      .tailor(request(), callOptions())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvalidPlanError);
    expect(isInvalidOutput(error)).toBe(true);
    expect((error as InvalidPlanError).issues).toEqual(['language is "en", expected "pl"']);
  });

  it("rejects citations of unknown IDs, listing paths and IDs only", async () => {
    const plan = smallPlan();
    const skill = plan.skills[0];
    if (!skill) throw new Error("fixture changed");
    skill.sourceIds = ["skl_ghost"];
    const fake = fakeProvider({ plan: [plan] });

    await expect(
      new Tailoring(fake.provider).tailor(request(), callOptions()),
    ).rejects.toMatchObject({
      issues: ['skills[0] cites unknown id "skl_ghost"'],
    });
  });

  it("requires headings for every shown section in a language without built-in ones", async () => {
    const german = { ...smallPlan(), language: "de" };
    const fake = fakeProvider({ plan: [german] });

    const error = (await new Tailoring(fake.provider)
      .tailor(request({ override: "de" }), callOptions())
      .catch((caught: unknown) => caught)) as InvalidPlanError;

    expect(error.issues).toEqual(
      ["summary", "experience", "skills", "languages", "certifications"].map(
        (key) => `headings.${key} is missing for language "de"`,
      ),
    );
  });

  it("accepts a non-PL/EN plan with all needed headings", () => {
    const plan = {
      ...smallPlan(),
      language: "de",
      headings: {
        summary: "Profil",
        experience: "Berufserfahrung",
        projects: null,
        education: null,
        skills: "Kenntnisse",
        languages: "Sprachen",
        certifications: "Zertifikate",
      },
    };

    expect(missingHeadings(plan, smallProfile())).toEqual([]);
    expect(missingHeadings(smallPlan(), smallProfile())).toEqual([]);
  });

  it("refuses an unconfirmed profile without calling Claude", async () => {
    const fake = fakeProvider({ plan: [smallPlan()] });

    await expect(
      new Tailoring(fake.provider).tailor(
        request({ profile: { ...smallProfile(), confirmedAt: null } }),
        callOptions(),
      ),
    ).rejects.toMatchObject({ reason: "PROFILE_NOT_CONFIRMED" });
    expect(fake.calls.tailor).toBe(0);
  });
});

describe("createTailoringServices", () => {
  it("wires the three services over one provider and cache", async () => {
    const { cache } = memoryCache();
    const fake = fakeProvider({ requirements: [smallRequirements()] });

    const services = createTailoringServices({ provider: fake.provider, cache, now: () => NOW });
    await services.requirementsResolution.resolve(ad(), callOptions());

    expect(services.profileExtraction).toBeInstanceOf(ProfileExtraction);
    expect(services.tailoring).toBeInstanceOf(Tailoring);
    expect(fake.calls.parseRequirements).toBe(1);
  });
});
