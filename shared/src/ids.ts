import { z } from "zod";

/**
 * Stable identifier of a profile item or bullet. IDs are opaque (never derived from content),
 * so editing text can never change them; plan lines cite them as `sourceIds`.
 */
export const IdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "may only contain letters, digits, '_' and '-'");

export type Id = z.infer<typeof IdSchema>;

const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const ID_RANDOM_LENGTH = 10;

/** Creates a new random ID such as `exp_k3x9q0b2m1`, never colliding with `existingIds`. */
export function newId(prefix: string, existingIds: ReadonlySet<string> = new Set()): Id {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(ID_RANDOM_LENGTH));
    const random = Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
    const id = `${prefix}_${random}`;
    if (!existingIds.has(id)) return id;
  }
}

/** Returns every ID that occurs more than once, in first-seen order. */
export function findDuplicateIds(ids: Iterable<string>): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}
