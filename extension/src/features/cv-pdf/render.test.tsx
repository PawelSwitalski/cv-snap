// @vitest-environment node
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { buildLongCv, smallPlan, smallProfile } from "../../../test/cv-fixtures";
import { buildCvModel, type CvModel } from "./cv-model";
import { registerCvFonts } from "./fonts";
import { countPdfPages, renderCvPdf, renderFittedCv } from "./render";

/** Real renders (react-pdf in Node, same code path as the extension) read back with pdf.js. */
const FONT_DIR = fileURLToPath(new URL("../../../public/fonts/", import.meta.url));
const POLISH = "Zażółć gęślą jaźń — ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż";
/** 1×1 transparent PNG. */
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

interface ReadPdf {
  pageCount: number;
  pageSizes: number[][];
  pages: string[];
  text: string;
}

async function readPdf(blob: Blob): Promise<ReadPdf> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await blob.arrayBuffer());
  const task = pdfjs.getDocument({ data, verbosity: 0 });
  const doc = await task.promise;
  const pages: string[] = [];
  const pageSizes: number[][] = [];
  for (let number = 1; number <= doc.numPages; number++) {
    const page = await doc.getPage(number);
    pageSizes.push(page.view.slice(2).map((size) => Math.round(size)));
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  await task.destroy();
  return { pageCount: doc.numPages, pageSizes, pages, text: pages.join("\n") };
}

const smallModel = (overrides: Partial<CvModel> = {}): CvModel => ({
  ...buildCvModel(smallProfile(), smallPlan(), { clause: "Wyrażam zgodę na przetwarzanie." }),
  ...overrides,
});

const longModel = () => {
  const { profile, plan } = buildLongCv(12, 6);
  return buildCvModel(profile, plan, { clause: "Klauzula RODO na końcu dokumentu." });
};

beforeAll(() => {
  registerCvFonts((fileName) => FONT_DIR + fileName);
});

describe("renderCvPdf", () => {
  it("renders an A4 PDF with selectable text", async () => {
    const read = await readPdf(await renderCvPdf(smallModel()));

    expect(read.pageCount).toBe(1);
    expect(read.pageSizes).toEqual([[595, 842]]);
    expect(read.text).toContain("Jan Testowy");
    expect(read.text).toContain("Przeprowadził migrację aplikacji do TypeScript.");
    expect(read.text).toContain("Wyrażam zgodę na przetwarzanie.");
  });

  it("keeps Polish diacritics intact (embedded font, extractable text)", async () => {
    const model = smallModel({
      header: { ...smallModel().header, fullName: "Łukasz Żółć", headline: POLISH },
    });

    const read = await readPdf(await renderCvPdf(model));

    expect(read.text).toContain("Łukasz Żółć");
    expect(read.text.replace(/\s+/g, " ")).toContain(POLISH);
  });

  it("keeps every letter in later documents (fonts aren't reused between renders)", async () => {
    // Regression: after a document whose regular text had "Ó" but no plain "O", react-pdf's reused
    // font objects dropped or garbled "O" in later PDFs' text layer ("RODO" → "R@D@" / "D").
    const withHeadline = (headline: string) =>
      smallModel({ clause: null, header: { ...smallModel().header, headline } });

    await renderCvPdf(withHeadline("Ó ó"));
    const read = await readPdf(await renderCvPdf(withHeadline("RODO Ola ó Ó ODO")));

    expect(read.text).toContain("RODO Ola ó Ó ODO");
  });

  it("prints the section headings in the CV language", async () => {
    const read = await readPdf(await renderCvPdf(smallModel()));

    // Headings are uppercased by the template's style.
    expect(read.text).toMatch(/DOŚWIADCZENIE ZAWODOWE/);
    expect(read.text).toMatch(/UMIEJĘTNOŚCI/);
  });

  it("renders with a photo and without one", async () => {
    const withPhoto = smallModel({ header: { ...smallModel().header, photoDataUrl: PHOTO } });

    const read = await readPdf(await renderCvPdf(withPhoto));

    expect(read.text).toContain("Jan Testowy");
  });

  it("counts pages the same way pdf.js does", async () => {
    const blob = await renderCvPdf(longModel());
    const bytes = new Uint8Array(await blob.arrayBuffer());

    expect(countPdfPages(bytes)).toBe((await readPdf(blob)).pageCount);
    expect(countPdfPages(bytes)).toBeGreaterThan(2);
  });
});

describe("renderFittedCv", () => {
  it("fits a long CV to two pages within 3 s, dropping the lowest-ranked content first", async () => {
    const startedAt = performance.now();

    const result = await renderFittedCv(longModel());
    const elapsedMs = performance.now() - startedAt;
    const read = await readPdf(result.pdf);

    expect(result.fits).toBe(true);
    expect(read.pageCount).toBeLessThanOrEqual(2);
    expect(result.pageCount).toBe(read.pageCount);
    expect(elapsedMs).toBeLessThan(3000);
    // Lowest rank first: every dropped entry ranks below every fully kept entry, and only the
    // best-ranked dropped entry may have lost just some bullets (bullets go before the item).
    const rank = (id: string) => Number(id.replace("exp_", ""));
    const droppedRanks = result.dropped.map((d) => rank(d.entryId));
    const kept = result.model.sections.flatMap((s) => (s.layout === "entries" ? s.entries : []));
    const fullyKept = kept.filter((entry) => !result.dropped.some((d) => d.entryId === entry.id));
    expect(droppedRanks.length).toBeGreaterThan(0);
    expect(Math.min(...droppedRanks)).toBeGreaterThan(
      Math.max(...fullyKept.map((e) => rank(e.id))),
    );
    expect(result.dropped.filter((d) => d.kind === "item").map((d) => rank(d.entryId))).toEqual(
      [7, 8, 9, 10, 11, 12].filter(
        (r) => droppedRanks.includes(r) && r > Math.min(...droppedRanks),
      ),
    );
    // Header, rank-1 item and clause are kept.
    expect(read.text).toContain("Jan Testowy");
    expect(read.text).toContain("Inżynier oprogramowania 1 ");
    expect(read.pages.at(-1)).toContain("Klauzula RODO na końcu dokumentu.");
    // Dropped items are really gone from the PDF.
    for (const dropped of result.dropped.filter((d) => d.kind === "item")) {
      expect(read.text).not.toContain(`${dropped.title ?? ""} `);
    }
  });

  it("drops the same content every time", async () => {
    const first = await renderFittedCv(longModel());
    const second = await renderFittedCv(longModel());

    expect(second.dropped).toEqual(first.dropped);
  });

  it("drops nothing when the CV already fits", async () => {
    const result = await renderFittedCv(smallModel());

    expect(result).toMatchObject({ dropped: [], pageCount: 1, fits: true });
  });
});
