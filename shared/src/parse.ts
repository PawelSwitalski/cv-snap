import { z } from "zod";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** Parses untrusted data; on failure returns a human-readable, multi-line issue list. */
export function parseWithReadableError<T extends z.ZodType>(
  schema: T,
  input: unknown,
): ParseResult<z.infer<T>> {
  const result = schema.safeParse(input);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, message: z.prettifyError(result.error) };
}
