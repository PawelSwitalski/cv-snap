import type {
  CreateProfileInput,
  CvGenerationProvider,
  CvProfileContent,
  HealthReport,
  JobRequirements,
  ParseRequirementsInput,
  ProviderCallOptions,
  TailoringPlan,
  TailorInput,
} from "@cv-snap/shared";
import type { NativeHostClient } from "@/lib/native-host-client";

/**
 * `CvGenerationProvider` over the native-messaging port (ddd-02): the extension's only way to the
 * AI steps. Replies are validated by the client against the shared schemas; errors arrive as
 * `CvSnapError` with the host's code.
 */
export class NativeHostProvider implements CvGenerationProvider {
  constructor(private readonly client: NativeHostClient) {}

  checkHealth(options: { signal: AbortSignal }): Promise<HealthReport> {
    return this.client.request<"health">({ type: "health" }, { signal: options.signal });
  }

  createProfile(
    input: CreateProfileInput,
    options: ProviderCallOptions,
  ): Promise<CvProfileContent> {
    return this.client.request<"createProfile">(
      { type: "createProfile", model: options.model, cvText: input.cvText },
      callOptions(options),
    );
  }

  parseRequirements(
    input: ParseRequirementsInput,
    options: ProviderCallOptions,
  ): Promise<JobRequirements> {
    return this.client.request<"parseRequirements">(
      {
        type: "parseRequirements",
        model: options.model,
        adText: input.adText,
        url: input.url,
        structuredFields: input.structuredFields ?? null,
      },
      callOptions(options),
    );
  }

  tailor(input: TailorInput, options: ProviderCallOptions): Promise<TailoringPlan> {
    return this.client.request<"tailor">(
      {
        type: "tailor",
        model: options.model,
        profile: input.profile,
        requirements: input.requirements,
        outputLanguage: input.outputLanguage,
        validatorFeedback: input.validatorFeedback,
      },
      callOptions(options),
    );
  }
}

function callOptions(options: ProviderCallOptions) {
  return { signal: options.signal, onProgress: options.onProgress };
}
