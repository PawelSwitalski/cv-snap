// @vitest-environment node
import { fileURLToPath } from "node:url";
import { planLines } from "@cv-snap/shared";
import { beforeAll, describe, expect, it } from "vitest";
import { buildLongCv } from "../../../test/cv-fixtures";
import { registerCvFonts } from "@/features/cv-pdf/fonts";
import { renderFittedCv } from "@/features/cv-pdf/render";
import { buildPreviewModel } from "./preview-model";

/**
 * FR-13 with the real renderer: the PDF that Download saves holds exactly the lines of the fitted
 * model the preview shows: edits in, removed lines out, two-page drops out.
 */
const FONT_DIR = fileURLToPath(new URL("../../../public/fonts/", import.meta.url));

async function pdfText(blob: Blob): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), verbosity: 0 });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let number = 1; number <= doc.numPages; number++) {
    const content = await (await doc.getPage(number)).getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  await task.destroy();
  // Line wrapping splits text into items; compare on single spaces.
  return pages.join(" ").replace(/\s+/g, " ");
}

beforeAll(() => {
  registerCvFonts((fileName) => FONT_DIR + fileName);
});

describe("preview and PDF parity", () => {
  it("downloads exactly the fitted preview, with the user's edits and removals", async () => {
    const { profile, plan } = buildLongCv(10, 5);
    const lines = planLines(plan).filter((line) => line.kind === "bullet");
    const edited = lines[0];
    const removed = lines[1];
    if (!edited || !removed) throw new Error("fixture has too few bullets");
    const preview = buildPreviewModel(plan, profile, {
      edits: { [edited.lineId]: "Zmienione przez użytkownika zdanie testowe." },
      removed: [removed.lineId],
    });

    const fitted = await renderFittedCv(preview.model);
    const text = await pdfText(fitted.pdf);

    expect(fitted.dropped.length).toBeGreaterThan(0);
    const shownBullets = fitted.model.sections
      .filter((section) => section.layout === "entries")
      .flatMap((section) => section.entries.flatMap((entry) => entry.bullets));
    for (const bullet of shownBullets) expect(text).toContain(bullet);
    for (const dropped of fitted.dropped) {
      if (dropped.text) expect(text).not.toContain(dropped.text);
    }
    expect(text).toContain("Zmienione przez użytkownika zdanie testowe.");
    expect(text).not.toContain(removed.text);
  }, 60_000);
});
