import type { CvGenerationProvider } from "@cv-snap/shared";
import { createNativeHostClient } from "@/lib/native-host-client";
import { NativeHostProvider } from "@/lib/native-host-provider";
import type { Clock, RequirementsCacheRepository } from "./ports";
import { ProfileExtraction } from "./profile-extraction";
import { ChromeStorageRequirementsCache } from "./requirements-cache-store";
import { RequirementsResolution } from "./requirements-resolution";
import { Tailoring } from "./tailoring";

export interface TailoringServices {
  profileExtraction: ProfileExtraction;
  requirementsResolution: RequirementsResolution;
  tailoring: Tailoring;
}

/**
 * Wires the three AI-step services for the background worker. The pipeline (bolt 006) and the
 * background message API (bolt 011) use these; tests pass their own provider and cache.
 */
export function createTailoringServices(
  deps: {
    provider?: CvGenerationProvider;
    cache?: RequirementsCacheRepository;
    now?: Clock;
  } = {},
): TailoringServices {
  const provider = deps.provider ?? new NativeHostProvider(createNativeHostClient());
  const cache = deps.cache ?? new ChromeStorageRequirementsCache();
  return {
    profileExtraction: new ProfileExtraction(provider),
    requirementsResolution: new RequirementsResolution(provider, cache, deps.now),
    tailoring: new Tailoring(provider),
  };
}
