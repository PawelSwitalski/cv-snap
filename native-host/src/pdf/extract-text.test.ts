import { describe, expect, it } from "vitest";
import { buildPdf, column } from "../../test/pdf-fixtures.js";
import { extractPdfText, MAX_PDF_BYTES } from "./extract-text.js";

const b64 = (bytes: Buffer) => bytes.toString("base64");

const LEFT = ["Contact", "Skills", "TypeScript", "React", "Languages", "English C1"];
const RIGHT = [
  "Experience",
  "Frontend Developer at Acme",
  "Built the design system",
  "Education",
  "Computer Science, AGH",
  "Graduated 2019",
];

describe("extractPdfText", () => {
  it("returns the text and page count of a text-based PDF", async () => {
    const pdf = buildPdf([
      { texts: column(["Jan Testowy", "Frontend Developer", "Krakow, Poland"], 60) },
    ]);

    const result = await extractPdfText(b64(pdf));

    expect(result).toEqual({
      text: "Jan Testowy\nFrontend Developer\nKrakow, Poland",
      pageCount: 1,
    });
  });

  it("reads a two-column CV column by column, never interleaving lines", async () => {
    const pdf = buildPdf([
      {
        texts: [
          { text: "Jan Testowy - Curriculum Vitae", x: 60, y: 810, size: 14 },
          ...column(LEFT, 40, 770),
          ...column(RIGHT, 260, 770),
        ],
      },
    ]);

    const { text } = await extractPdfText(b64(pdf));
    const lines = text.split("\n");

    expect(lines).toEqual(["Jan Testowy - Curriculum Vitae", ...LEFT, ...RIGHT]);
  });

  it("removes a header and footer repeated on every page", async () => {
    const page = (n: number, body: string) => ({
      texts: [
        { text: "Jan Testowy - CV", x: 60, y: 810 },
        { text: body, x: 60, y: 600 },
        { text: `Strona ${String(n)} z 2`, x: 260, y: 30 },
      ],
    });

    const { text, pageCount } = await extractPdfText(
      b64(buildPdf([page(1, "First page body text here"), page(2, "Second page body text")])),
    );

    expect(pageCount).toBe(2);
    expect(text.match(/Jan Testowy - CV/g)).toHaveLength(1);
    expect(text.match(/Strona \d z 2/g)).toHaveLength(1);
    expect(text).toContain("Second page body text");
  });

  it("rejects an image-only (scanned) PDF with NO_TEXT", async () => {
    await expect(extractPdfText(b64(buildPdf([{ hasImage: true }])))).rejects.toMatchObject({
      code: "PDF_PARSE_FAILED",
      reason: "NO_TEXT",
    });
  });

  it("rejects a password-protected PDF with PASSWORD_PROTECTED", async () => {
    const pdf = buildPdf([{ texts: column(["Secret CV text"], 60) }], { encrypted: true });

    await expect(extractPdfText(b64(pdf))).rejects.toMatchObject({
      code: "PDF_PARSE_FAILED",
      reason: "PASSWORD_PROTECTED",
    });
  });

  it("rejects a file that isn't a PDF with CORRUPTED", async () => {
    await expect(
      extractPdfText(b64(Buffer.from("This is a Word document, honestly."))),
    ).rejects.toMatchObject({ code: "PDF_PARSE_FAILED", reason: "CORRUPTED" });
  });

  it("rejects an empty upload with CORRUPTED", async () => {
    await expect(extractPdfText("")).rejects.toMatchObject({ reason: "CORRUPTED" });
  });

  it("fails with PDF_PARSE_FAILED, never a crash, for a truncated PDF", async () => {
    const pdf = buildPdf([{ texts: column(["Jan Testowy", "Developer"], 60) }]);

    await expect(extractPdfText(b64(pdf.subarray(0, 120)))).rejects.toMatchObject({
      code: "PDF_PARSE_FAILED",
    });
  });

  it("rejects files over 10 MB before parsing them", async () => {
    await expect(extractPdfText(b64(Buffer.alloc(MAX_PDF_BYTES + 1)))).rejects.toMatchObject({
      code: "PDF_PARSE_FAILED",
      reason: "TOO_LARGE",
    });
  });

  it("stops with CANCELLED when the request is cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const pdf = buildPdf([{ texts: column(["Jan Testowy", "Developer"], 60) }]);

    await expect(extractPdfText(b64(pdf), { signal: controller.signal })).rejects.toMatchObject({
      code: "CANCELLED",
    });
  });
});
