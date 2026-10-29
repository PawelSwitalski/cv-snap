import { readHead, startsWith } from "@/lib/file-checks";

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type PhotoProblem = "NOT_IMAGE" | "TOO_LARGE";

/** JPG or PNG (checked by signature, not just the name), at most 2 MB (FR-5). */
export async function validatePhoto(file: Blob): Promise<PhotoProblem | null> {
  if (file.size > MAX_PHOTO_BYTES) return "TOO_LARGE";
  const head = await readHead(file, PNG_MAGIC.length);
  return startsWith(head, JPEG_MAGIC) || startsWith(head, PNG_MAGIC) ? null : "NOT_IMAGE";
}
