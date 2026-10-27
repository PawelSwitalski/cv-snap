import { CvSnapError } from "@cv-snap/shared";

/** True for model output that failed the schema or a domain rule (retryable once). */
export function isInvalidOutput(error: unknown): boolean {
  return (
    error instanceof CvSnapError &&
    error.code === "GENERATION_FAILED" &&
    error.reason === "INVALID_OUTPUT"
  );
}

/**
 * Runs `attempt` and, on invalid output only, once more (ddd-02: profile and requirements steps).
 * Transport and provider errors (timeout, cancel, model unavailable, …) are never retried.
 */
export async function retryOnceOnInvalidOutput<T>(
  attempt: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (!isInvalidOutput(error) || signal.aborted) throw error;
    return attempt();
  }
}
