import { readHead, startsWith } from "@/lib/file-checks";

/** Same limit as the host's PDF extraction (FR-3). */
export const MAX_CV_BYTES = 10 * 1024 * 1024;

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

export type CvFileProblem = "NOT_PDF" | "TOO_LARGE" | "EMPTY";

/**
 * Checks a chosen file before anything is sent (story 003): a `.pdf` name or PDF type, the `%PDF-`
 * signature (so a renamed file is caught), and at most 10 MB.
 */
export async function validateCvFile(file: File): Promise<CvFileProblem | null> {
  if (file.size === 0) return "EMPTY";
  if (file.size > MAX_CV_BYTES) return "TOO_LARGE";
  const looksLikePdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) return "NOT_PDF";
  return startsWith(await readHead(file, PDF_MAGIC.length), PDF_MAGIC) ? null : "NOT_PDF";
}
