import { describe, expect, it } from "vitest";
import { blobToBase64 } from "@/lib/file-checks";
import { bytesFile, PNG_HEAD, pdfFile } from "../../../test/panel-fixtures";
import { MAX_CV_BYTES, validateCvFile } from "./validate-file";

describe("validateCvFile", () => {
  it("accepts a PDF by signature", async () => {
    expect(await validateCvFile(pdfFile())).toBeNull();
  });

  it("accepts a PDF of exactly 10 MB", async () => {
    expect(await validateCvFile(pdfFile("cv.pdf", MAX_CV_BYTES))).toBeNull();
  });

  it("rejects a file over 10 MB before reading it", async () => {
    expect(await validateCvFile(pdfFile("cv.pdf", MAX_CV_BYTES + 1))).toBe("TOO_LARGE");
  });

  it("rejects a non-PDF name and type", async () => {
    expect(await validateCvFile(bytesFile(PNG_HEAD, "photo.png", "image/png"))).toBe("NOT_PDF");
  });

  it("rejects a renamed file whose content isn't a PDF", async () => {
    expect(await validateCvFile(bytesFile(PNG_HEAD, "cv.pdf", "application/pdf"))).toBe("NOT_PDF");
  });

  it("rejects an empty file", async () => {
    expect(await validateCvFile(new File([], "cv.pdf", { type: "application/pdf" }))).toBe("EMPTY");
  });
});

describe("blobToBase64", () => {
  it("encodes large files in chunks without overflowing the call stack", async () => {
    const size = 200_000;
    const encoded = await blobToBase64(pdfFile("cv.pdf", size));

    expect(atob(encoded).length).toBe(size);
    expect(atob(encoded).startsWith("%PDF-")).toBe(true);
  });
});
